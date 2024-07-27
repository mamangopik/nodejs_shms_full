// DOM
var recorded_lbl = document.getElementById('recorded');
// var btn_scroll = document.getElementById('btn-autoscroll');
var btn_download = document.getElementById('btn-download');
var btn_axis = {
    x: document.getElementById('btn-x'),
    y: document.getElementById('btn-y'),
    z: document.getElementById('btn-z'),
    toggle_x: 1,
    toggle_y: 1,
    toggle_z: 1
}

var peaks1_table = document.getElementsByClassName("peak-1-val-wrap");
var peaks2_table = document.getElementsByClassName("peak-2-val-wrap");
var peaks3_table = document.getElementsByClassName("peak-3-val-wrap");

var peaks_table = {
    x: [peaks1_table[0], peaks2_table[0], peaks3_table[0]],
    y: [peaks1_table[1], peaks2_table[1], peaks3_table[1]],
    z: [peaks1_table[2], peaks2_table[2], peaks3_table[2]]
};

const draggable = document.getElementById("peak-info-popup");
show_history_status = 0;

// GLOBAL
var acc_data = {
    x: [],
    y: [],
    z: [],
    xkf: [],
    ykf: [],
    zkf: [],
    timestamp: []
}
var last_id_data = 0;
var packet_id_overflow = 0;
var packet_loss = 0;
var peaks_req = 10;
var render_fft_graph = 1;
var mqtt;
var reconnectTimeout = 2000;
var ws_addr = window.location.host.replace(':7777', '');
var host = ws_addr;
var port = 9001;
var last_log = 0;
var RSSI = 0;
var v_batt = 0;
var packet_length = 64;
const urlParams = new URLSearchParams(window.location.search);
const topic = urlParams.get('topic');
const baseUrl = window.location.protocol + "//" + window.location.host;
var python_ws_addr = 'ws://' + window.location.host.replace(':7777', ':7778');
var acc_to_send = {};
var acc_to_send_kf = {};
var acc_to_send_history = {
    xHist: [],
    yHist: [],
    zHist: []
};
var acc_to_send_status = 0;
var history_fft_status = 0;
var indeks = 0;
var window_area = 1024 * 2;
var window_size = window_area;
var last_length = 0;
var fft_plot_heigh = 200;
const clientId = "realtime_acc_publisher_" + Math.random().toString(16).substr(2, 8);

const toolbar = {
    modeBarButtonsToRemove: ['autoScale2d']
}


const hide_toolbar = {
    displayModeBar: false, // this is the line that hides the bar.
};

var layout = {
    height: 300,
    autosize: true,
    yaxis: {
        title: 'Acc',
    },
    xaxis: {
        title: 'Waktu'
    },
    showlegend: true,
    margin: { // Set the margin to zero
        l: 50,
        r: 0,
        t: 0,
        b: 50,
        pad: 0
    }
};

var layout_fft = {
    'x': {
        height: fft_plot_heigh,
        autosize: true,
        yaxis: {
            title: 'mag',
        },
        xaxis: {
            title: 'freq'
        },
        annotations: [],
        showlegend: true,
        margin: { // Set the margin to zero
            l: 50,
            r: 0,
            t: 0,
            b: 50,
            pad: 0
        }
    },
    'y': {
        height: fft_plot_heigh,
        autosize: true,
        yaxis: {
            title: 'mag',
        },
        xaxis: {
            title: 'freq'
        },
        annotations: [],
        showlegend: true,
        margin: { // Set the margin to zero
            l: 50,
            r: 0,
            t: 0,
            b: 50,
            pad: 0
        }
    },
    'z': {
        height: fft_plot_heigh,
        autosize: true,
        yaxis: {
            title: 'mag',
        },
        xaxis: {
            title: 'freq'
        },
        annotations: [],
        showlegend: true,
        margin: { // Set the margin to zero
            l: 50,
            r: 0,
            t: 0,
            b: 50,
            pad: 0
        }
    }
}

var layout_history = {
    height: 300,
    title: 'Data History Time Domain VIBRASi',
    yaxis: {
        title: 'Acc',
    },
    xaxis: {
        title: 'Waktu'
    },
    showlegend: true,
    margin: { // Set the margin to zero
        l: 50,
        r: 0,
        t: 0,
        b: 50,
        pad: 0
    },
};

var autoscroll_status = 1;
var interpolate_status = 1;

// Functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const findTopPeaks = async (x, y) => {
    max_x = Math.max.apply(null, x);
    max_y = Math.max.apply(null, y);
    max_freq = x[y.indexOf(max_y)];

    return { x: max_freq, y: max_y };
}

const update_history = async () => {
    var xhistory = {
        y: acc_data.x,
        text: acc_data.timestamp,
        type: 'scatter',
        mode: 'lines',
        name: 'x',
    };
    var yhistory = {
        y: acc_data.y,
        text: acc_data.timestamp,
        type: 'scatter',
        mode: 'lines',
        name: 'y',
    };
    var zhistory = {
        y: acc_data.z,
        text: acc_data.timestamp,
        type: 'scatter',
        mode: 'lines',
        name: 'z',
    };
    acc_to_send_history.xHist = xhistory.y;
    acc_to_send_history.yHist = yhistory.y;
    acc_to_send_history.zHist = zhistory.y;
    data = [xhistory, yhistory, zhistory];
    if (show_history_status == 1) {
        Plotly.newPlot('acc_history', data, layout_history);
        history_fft_status = 1;
    }
}

const get_peak_label = (x, y, index) => {
    let html =
        `<b style="font-size:16px">` +
        `Peak${index}` +
        `</b>` +
        `<br>` +
        `<b style="font-size:12px">` +
        `${x}Hz` +
        `</b>` +
        `<br>` +
        `<b style="font-size:12px">` +
        `${y} mG` +
        `</b>`
    return html;
}


const draw_fft = async (div, layout, data, peaks) => {
    let i = 1;
    for (let j = 0; j < peaks.length; j++) {
        const annotation = {
            x: parseFloat(peaks[j][0]),
            y: parseFloat(peaks[j][1]),
            // text: get_peak_label(parseFloat(peak[0]).toFixed(4), parseFloat(peak[1]).toFixed(4), i),
            text: i,
            showarrow: true,
            arrowhead: 2,
            ax: 0,
            ay: -50,
            font: {
                family: 'Courier New, monospace',
                size: 16,
                color: '#ffffff'
            },
            align: 'center',
            bordercolor: '#c7c7c7',
            borderwidth: 2,
            borderpad: 4,
            bgcolor: 'rgb(71, 67, 58)',
            opacity: 0.7
        };
        layout.annotations.push(annotation);
        if (data[0].name == 'X' || data[0].name == 'x') {
            document.getElementsByClassName("fftx_peaks")[i - 1].innerHTML = `${i}). ${parseFloat(peaks[j][0]).toFixed(3)}Hz @ ${parseFloat(peaks[j][1]).toFixed(3)}mG`;
        }
        if (data[0].name == 'Y' || data[0].name == 'y') {
            document.getElementsByClassName("ffty_peaks")[i - 1].innerHTML = `${i}). ${parseFloat(peaks[j][0]).toFixed(3)}Hz @ ${parseFloat(peaks[j][1]).toFixed(3)}mG`;
        }
        if (data[0].name == 'Z' || data[0].name == 'z') {
            document.getElementsByClassName("fftz_peaks")[i - 1].innerHTML = `${i}). ${parseFloat(peaks[j][0]).toFixed(3)}Hz @ ${parseFloat(peaks[j][1]).toFixed(3)}mG`;
        }
        i++;
    }

    Plotly.newPlot(div, data, layout, hide_toolbar, {
        staticPlot: true
    });
    layout.annotations = [];
}

const push_acc_data = async (data) => {
    RSSI = data.signal_strength;
    v_batt = data.battery_voltage;
    if (data.x_values) {
        data.x_values.forEach(async x => {
            acc_data.x.push(parseFloat(x));
        });
    }
    if (data.y_values) {
        data.y_values.forEach(async y => {
            acc_data.y.push(parseFloat(y));
        });
    }
    if (data.z_values) {
        data.z_values.forEach(async z => {
            acc_data.z.push(parseFloat(z));
        });
    }
    if (data.xkf_values) {
        data.xkf_values.forEach(async x => {
            acc_data.xkf.push(parseFloat(x));
        });
    }
    if (data.ykf_values) {
        data.ykf_values.forEach(async y => {
            acc_data.ykf.push(parseFloat(y));
        });
    }
    if (data.zkf_values) {
        data.zkf_values.forEach(async z => {
            acc_data.zkf.push(parseFloat(z));
        });
    }
    if (data.timestamp) {
        data.timestamp.forEach(async z => {
            timestamp = z;
            date = new Date(timestamp * 1000);

            // Set the desired time zone (e.g., Asia/Shanghai for UTC+8)
            let timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            // Create an Intl.DateTimeFormat object with the specified time zone
            let formatter = new Intl.DateTimeFormat('en-US', {
                timeZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            });

            // Format the date in the desired time zone
            formattedDateTime = formatter.format(date);
            let ms = String(timestamp).split('.')[1]
            if (ms !== undefined) {
                formattedDateTime += ('.' + ms);
            }
            acc_data.timestamp.push(formattedDateTime);
        });
    }
}

const download = async () => {
    var csvContent = "id,x,y,z,date_time(UTC+0)\n";
    for (var i = 0; i < acc_data.x.length; i++) {
        csvContent += `${i + 1},${acc_data.x[i]},${acc_data.y[i]},${acc_data.z[i]},${acc_data.timestamp[i]}\n`;
    }
    // Create a Blob with the CSV data
    var blob = new Blob([csvContent], { type: 'text/csv' });
    // Create a download link
    var a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = `${acc_data.timestamp[acc_data.x.length - 1]}_acc_data.csv`;
    a.style.display = 'none';
    // Append the link to the body and trigger the download
    document.body.appendChild(a);
    a.click();
    // Clean up
    document.body.removeChild(a);
}

// SOCKET
var socket_io = io.connect(baseUrl);

// function connect() {
//     var ws = new WebSocket(python_ws_addr);
//     ws.onopen = function () {
//         console.log('terhubung ke socket');
//         // acc_to_send_status = 1;
//     }
//     let fft_beacon = setInterval(() => {
//         console.log("FFT requests");
//         try {
//             if (acc_to_send_status == 1 && render_fft_graph == 1) {
//                 acc_to_send_status = 0;
//                 acc_to_send.peaks_req = peaks_req;
//                 ws.send(JSON.stringify(acc_to_send));
//                 console.log("request realtime FFT data");
//             }
//             if (history_fft_status == 1) {
//                 acc_to_send_history['fs'] = data_acc.sampling_frequency;
//                 acc_to_send_history['cid'] = "history_" + clientId;
//                 ws.send(JSON.stringify(acc_to_send_history));
//                 console.log("request historycal FFT data");
//             }
//         } catch (error) {
//             console.log(error);
//         }
//     }, 300);
//     ws.onmessage = async function (e) {
//         data = JSON.parse(e.data)
//         if (data.cid != clientId) {
//             console.log("FFT History");
//             var hist_fft_x = {
//                 x: data.data.xHist.frequency,
//                 y: data.data.xHist.magnitude,
//                 mode: 'lines',
//                 type: 'scatter',
//                 name: 'x',
//                 line: {
//                     color: 'rgb(3, 107, 252)',
//                     width: 2
//                 }
//             };
//             var hist_fft_y = {
//                 x: data.data.yHist.frequency,
//                 y: data.data.yHist.magnitude,
//                 mode: 'lines',
//                 type: 'scatter',
//                 name: 'y',
//                 line: {
//                     color: 'rgb(237, 162, 21)',
//                     width: 2
//                 }
//             };
//             var hist_fft_z = {
//                 x: data.data.zHist.frequency,
//                 y: data.data.zHist.magnitude,
//                 mode: 'lines',
//                 type: 'scatter',
//                 name: 'z',
//                 line: {
//                     color: 'rgb(242, 53, 53)',
//                     width: 2
//                 }
//             };
//             data = [];
//             if (btn_axis.toggle_x == 1) data.push(hist_fft_x)
//             if (btn_axis.toggle_y == 1) data.push(hist_fft_y)
//             if (btn_axis.toggle_z == 1) data.push(hist_fft_z)
//             if (show_history_status == 1) {
//                 Plotly.newPlot('fft_history', data, layout_history);
//                 history_fft_status = 0;
//             }
//         }
//         if (data.cid == clientId) {
//             var fft_x = {
//                 x: data.data.x.frequency,
//                 y: data.data.x.magnitude,
//                 mode: 'lines',
//                 type: 'scatter',
//                 name: 'x',
//                 line: {
//                     color: 'rgb(3, 107, 252)',
//                     width: 2
//                 }
//             };
//             var fft_y = {
//                 x: data.data.y.frequency,
//                 y: data.data.y.magnitude,
//                 mode: 'lines',
//                 type: 'scatter',
//                 name: 'y',
//                 line: {
//                     color: 'rgb(237, 162, 21)',
//                     width: 2
//                 }
//             };
//             var fft_z = {
//                 x: data.data.z.frequency,
//                 y: data.data.z.magnitude,
//                 mode: 'lines',
//                 type: 'scatter',
//                 name: 'z',
//                 line: {
//                     color: 'rgb(242, 53, 53)',
//                     width: 2
//                 }
//             };

//             var fft_x_kf = {
//                 x: data.data.x_kf.frequency,
//                 y: data.data.x_kf.magnitude,
//                 mode: 'lines',
//                 type: 'scatter',
//                 name: 'x_kf',
//                 line: {
//                     color: 'black',
//                     width: 2
//                 }
//             };
//             var fft_y_kf = {
//                 x: data.data.y_kf.frequency,
//                 y: data.data.y_kf.magnitude,
//                 mode: 'lines',
//                 type: 'scatter',
//                 name: 'y_kf',
//                 line: {
//                     color: 'black',
//                     width: 2
//                 }
//             };
//             var fft_z_kf = {
//                 x: data.data.z_kf.frequency,
//                 y: data.data.z_kf.magnitude,
//                 mode: 'lines',
//                 type: 'scatter',
//                 name: 'z_kf',
//                 line: {
//                     color: 'black',
//                     width: 2
//                 }
//             };

//             if (btn_axis.toggle_x == 1) {
//                 document.getElementById('fft_graph_x').style.display = 'block';
//                 document.getElementById('fft_graph_x_kf').style.display = 'block';
//                 draw_fft('fft_graph_x', layout_fft.x, [fft_x, fft_x_kf], data.peaks.x);
//             } else {
//                 document.getElementById('fft_graph_x').style.display = 'none';
//                 document.getElementById('fft_graph_x_kf').style.display = 'none';
//             }
//             if (btn_axis.toggle_y == 1) {
//                 document.getElementById('fft_graph_y').style.display = 'block';
//                 document.getElementById('fft_graph_y_kf').style.display = 'block';
//                 draw_fft('fft_graph_y', layout_fft.y, [fft_y, fft_y_kf], data.peaks.y);
//             } else {
//                 document.getElementById('fft_graph_y').style.display = 'none';
//                 document.getElementById('fft_graph_y_kf').style.display = 'none';
//             }
//             if (btn_axis.toggle_z == 1) {
//                 document.getElementById('fft_graph_z').style.display = 'block';
//                 document.getElementById('fft_graph_z_kf').style.display = 'block';
//                 draw_fft('fft_graph_z', layout_fft.z, [fft_z, fft_z_kf], data.peaks.z);
//             } else {
//                 document.getElementById('fft_graph_z').style.display = 'none';
//                 document.getElementById('fft_graph_z_kf').style.display = 'none';
//             }
//         }
//     };

//     ws.onclose = function (e) {
//         console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
//         clearInterval(fft_beacon);
//         setTimeout(function () {
//             connect();
//         }, 1000);
//     };

//     ws.onerror = function (err) {
//         console.error('Socket encountered error: ', err.message, 'Closing socket');
//         ws.close();
//     };
// }
// run socket to python server
// connect();
socket_io.on(`fft_${topic}`, async (data) => {
    // console.log(data);
    var fft_x = {
        x: data.data.x.frequency,
        y: data.data.x.magnitude,
        mode: 'lines',
        type: 'scatter',
        name: 'x',
        line: {
            color: 'rgb(3, 107, 252)',
            width: 2
        }
    };
    var fft_y = {
        x: data.data.y.frequency,
        y: data.data.y.magnitude,
        mode: 'lines',
        type: 'scatter',
        name: 'y',
        line: {
            color: 'rgb(237, 162, 21)',
            width: 2
        }
    };
    var fft_z = {
        x: data.data.z.frequency,
        y: data.data.z.magnitude,
        mode: 'lines',
        type: 'scatter',
        name: 'z',
        line: {
            color: 'rgb(242, 53, 53)',
            width: 2
        }
    };

    var fft_x_kf = {
        x: data.data.x_kf.frequency,
        y: data.data.x_kf.magnitude,
        mode: 'lines',
        type: 'scatter',
        name: 'x_kf',
        line: {
            color: 'black',
            width: 2
        }
    };
    var fft_y_kf = {
        x: data.data.y_kf.frequency,
        y: data.data.y_kf.magnitude,
        mode: 'lines',
        type: 'scatter',
        name: 'y_kf',
        line: {
            color: 'black',
            width: 2
        }
    };
    var fft_z_kf = {
        x: data.data.z_kf.frequency,
        y: data.data.z_kf.magnitude,
        mode: 'lines',
        type: 'scatter',
        name: 'z_kf',
        line: {
            color: 'black',
            width: 2
        }
    };

    if (btn_axis.toggle_x == 1) {
        document.getElementById('fft_graph_x').style.display = 'block';
        document.getElementById('fft_graph_x_kf').style.display = 'block';
        draw_fft('fft_graph_x', layout_fft.x, [fft_x, fft_x_kf], data.peaks.x);
    } else {
        document.getElementById('fft_graph_x').style.display = 'none';
        document.getElementById('fft_graph_x_kf').style.display = 'none';
    }
    if (btn_axis.toggle_y == 1) {
        document.getElementById('fft_graph_y').style.display = 'block';
        document.getElementById('fft_graph_y_kf').style.display = 'block';
        draw_fft('fft_graph_y', layout_fft.y, [fft_y, fft_y_kf], data.peaks.y);
    } else {
        document.getElementById('fft_graph_y').style.display = 'none';
        document.getElementById('fft_graph_y_kf').style.display = 'none';
    }
    if (btn_axis.toggle_z == 1) {
        document.getElementById('fft_graph_z').style.display = 'block';
        document.getElementById('fft_graph_z_kf').style.display = 'block';
        draw_fft('fft_graph_z', layout_fft.z, [fft_z, fft_z_kf], data.peaks.z);
    } else {
        document.getElementById('fft_graph_z').style.display = 'none';
        document.getElementById('fft_graph_z_kf').style.display = 'none';
    }

}
);
socket_io.on(topic, async (data) => {
    console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)
    data_acc = data;
    last_log = data_acc.last_log;
    packet_length = data_acc.packet_size;
    if (parseInt(data_acc.id_data) - parseInt(last_id_data) > 1) {
        console.log("data loss");
        packet_loss++;
    }
    if (parseInt(last_id_data) == 0 && parseInt(data_acc.id_data) == 0) {
        console.log("initial start");
    }
    if (parseInt(last_id_data) > 0 && parseInt(data_acc.id_data) == 0) {
        console.log("overflow");
        packet_id_overflow++;
    }
    last_id_data = data_acc.id_data;
    if (data_acc.x_values) {
        // acc_to_send_status = 1;
        push_acc_data(data_acc);
        acc_to_send['fs'] = data_acc.sampling_frequency;
        acc_to_send['cid'] = clientId;
        acc_to_send_kf['fs'] = data_acc.sampling_frequency;
        acc_to_send_kf['cid'] = clientId;
    }
});

socket_io.on(`${topic}_info`, async (data) => {
    last_log = data;
    console.log(last_log);
});

let history_beacon = setInterval(async () => {
    try {
        update_history();
    } catch (error) {
        console.log(error);
    }
}, 10000);


let animation_pointer = 0;

const update_recv_data_info = async (index) => {
    try {
        new Promise(() => {
            if (last_log != null) {
                recorded_lbl.innerHTML = `Recorded data: ${acc_data.x.length},
         Data in plot: ${0 + animation_pointer} to ${window_area + animation_pointer}</br>
         RSSI: <b>${RSSI}dB</b>, Battery Voltage: <b>${v_batt}</b>
         </br>Last Logged: <b>${new Date(last_log)}</b>
         </br>Packet ID:${last_id_data} packet loss:${packet_loss} ID overflow:${packet_id_overflow}
        `;
            } else {
                recorded_lbl.innerHTML = `Recorded data: ${acc_data.x.length},
         Data in plot: ${0 + animation_pointer} to ${window_area + animation_pointer}</br>
         RSSI: <b>${RSSI}dB</b>, Battery Voltage: <b>${v_batt}</b>
         </br>Last Logged: <b>Data logging is dissabled</b>
         </br>Packet ID:${last_id_data} packet loss:${packet_loss} ID overflow:${packet_id_overflow}
        `;
            }
        })
    } catch (error) {
        console.error(error);
    }
}
const animate_acc = async (index, setInterval_id) => {
    try {
        var xTrace = {
            y: acc_data.x.slice(index, index + window_size),
            text: acc_data.timestamp.slice(index, index + window_size),
            type: 'scatter',
            mode: 'lines',
            name: 'x',
            line: {
                color: 'rgb(0, 0, 255)',
                width: 1
            }
        };
        var yTrace = {
            y: acc_data.y.slice(index, index + window_size),
            text: acc_data.timestamp.slice(index, index + window_size),
            type: 'scatter',
            mode: 'lines',
            name: 'y',
            line: {
                color: 'rgb(0, 255, 0)',
                width: 1
            }
        };


        var zTrace = {
            y: acc_data.z.slice(index, index + window_size),
            text: acc_data.timestamp.slice(index, index + window_size),
            type: 'scatter',
            mode: 'lines',
            name: 'z',
            line: {
                color: 'rgb(255, 0, 0)',
                width: 1
            }
        };

        var xkfTrace = {
            y: acc_data.xkf.slice(index, index + window_size),
            text: acc_data.timestamp.slice(index, index + window_size),
            type: 'scatter',
            mode: 'lines',
            name: 'x KF',
            line: {
                color: 'rgb(0, 0, 255)',
                width: 1
            }
        };
        var ykfTrace = {
            y: acc_data.ykf.slice(index, index + window_size),
            text: acc_data.timestamp.slice(index, index + window_size),
            type: 'scatter',
            mode: 'lines',
            name: 'y KF',
            line: {
                color: 'rgb(0, 255, 0)',
                width: 1
            }
        };
        var zkfTrace = {
            y: acc_data.zkf.slice(index, index + window_size),
            text: acc_data.timestamp.slice(index, index + window_size),
            type: 'scatter',
            mode: 'lines',
            name: 'z KF',
            line: {
                color: 'rgb(255, 0, 0)',
                width: 1
            }
        };
        var plotData = [];
        var plotDatakf = [];

        if (btn_axis.toggle_x == 1) plotData.push(xTrace);
        if (btn_axis.toggle_y == 1) plotData.push(yTrace);
        if (btn_axis.toggle_z == 1) plotData.push(zTrace);

        if (btn_axis.toggle_x == 1) plotDatakf.push(xkfTrace);
        if (btn_axis.toggle_y == 1) plotDatakf.push(ykfTrace);
        if (btn_axis.toggle_z == 1) plotDatakf.push(zkfTrace);

        acc_to_send['x'] = xTrace.y;
        acc_to_send['y'] = yTrace.y;
        acc_to_send['z'] = zTrace.y;
        acc_to_send['x_kf'] = xkfTrace.y;
        acc_to_send['y_kf'] = ykfTrace.y;
        acc_to_send['z_kf'] = zkfTrace.y;

        acc_to_send_kf['x'] = xkfTrace.y;
        acc_to_send_kf['y'] = ykfTrace.y;
        acc_to_send_kf['z'] = zkfTrace.y;

        if (zTrace.y.length >= window_size) {
            let delta = acc_data.timestamp.length - animation_pointer;
            let SP = parseInt(window_size)
            if (delta > SP) {
                let error = delta - SP;
                animation_pointer += parseInt(error / 10);
                Plotly.newPlot('acc_graph', plotData, layout, { renderer: 'webgl' });
                Plotly.newPlot('acc_graph_kalman', plotDatakf, layout, { renderer: 'webgl' });
                acc_to_send_status = 1;
            } else {
                animation_pointer += 1;
            }
        }
        else {
            Plotly.newPlot('acc_graph', plotData, layout, { renderer: 'webgl' });
            Plotly.newPlot('acc_graph_kalman', plotDatakf, layout, { renderer: 'webgl' });
            acc_to_send_status = 1;
        }
    } catch (error) {
        console.error('something error:', error);
    }
    await delay(20);
}


setInterval(() => {
    if (acc_data.x.length > animation_pointer) {
        animate_acc(animation_pointer);
    }
}, 5);
let animation_id;
let cntr = 0;

// window.onload = window.onfocus = function () {
//     render_fft_graph = 1;
//     animation_id = setInterval(() => {
//         if (acc_data.x.length > animation_pointer) {
//             animate_acc(animation_pointer);
//         }
//     }, 200);
// }
// window.onblur = function () {
//     clearInterval(animation_id);
//     render_fft_graph = 0;
// }

setInterval(() => {
    update_recv_data_info(animation_pointer);
}, 3000);


setInterval(() => {
    date = Date.now();
    // Set the desired time zone (e.g., Asia/Shanghai for UTC+8)
    let timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Create an Intl.DateTimeFormat object with the specified time zone
    let formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        dateStyle: 'full',
        timeStyle: 'long',
    });

    // Format the date in the desired time zone
    formattedDateTime = formatter.format(date);
    document.getElementById("jam").innerHTML = String(formattedDateTime);
}, 1000);
// DOM events
// btn_scroll.onclick = () => {
//     if (autoscroll_status === 1) {
//         autoscroll_status = 0;
//         btn_scroll.className = 'btn btn-disable btn-md'
//     } else {
//         autoscroll_status = 1;
//         btn_scroll.className = 'btn btn-primary btn-md'
//     }
// }

btn_download.onclick = async () => {
    if (acc_data.x.length > 10) {
        download();
    }
}
btn_axis.x.onclick = () => {
    if (btn_axis.toggle_x === 1) {
        btn_axis.toggle_x = 0;
        btn_axis.x.className = 'btn btn-disable btn-md';
    } else {
        btn_axis.toggle_x = 1;
        btn_axis.x.className = 'btn btn-primary btn-md';
    }
}

btn_axis.y.onclick = () => {
    if (btn_axis.toggle_y === 1) {
        btn_axis.toggle_y = 0;
        btn_axis.y.className = 'btn btn-disable btn-md';
    } else {
        btn_axis.toggle_y = 1;
        btn_axis.y.className = 'btn btn-primary btn-md';
    }
}

btn_axis.z.onclick = () => {
    if (btn_axis.toggle_z === 1) {
        btn_axis.toggle_z = 0;
        btn_axis.z.className = 'btn btn-disable btn-md';
    } else {
        btn_axis.toggle_z = 1;
        btn_axis.z.className = 'btn btn-primary btn-md';
    }
}

// let isDragging = false;
// let offsetX, offsetY;
// draggable.addEventListener("mousedown", (e) => {
//     isDragging = true;
//     offsetX = e.clientX - draggable.getBoundingClientRect().left;
//     offsetY = e.clientY - draggable.getBoundingClientRect().top;
//     draggable.style.cursor = "grabbing";
// });
// document.addEventListener("mousemove", async (e) => {
//     if (isDragging) {
//         draggable.style.left = e.clientX - offsetX + "px";
//         draggable.style.top = e.clientY - offsetY + "px";
//     }
// });
// document.addEventListener("mouseup", async () => {
//     if (isDragging == true) {
//         draggable.style.cursor = "grab";
//     }
//     isDragging = false;
// });

document.getElementById("btn-toggle-history-show").onclick = () => {
    if (show_history_status == 1) {
        show_history_status = 0;
        document.getElementById("btn-toggle-history-show").innerHTML = "Show";
        document.getElementById("acc_history").style.display = 'none';
        document.getElementById("fft_history").style.display = 'none';
    } else {
        show_history_status = 1;
        document.getElementById("btn-toggle-history-show").innerHTML = "Hide";
        document.getElementById("acc_history").style.display = 'block';
        document.getElementById("fft_history").style.display = 'block';
    }
    console.log(show_history_status);
}
