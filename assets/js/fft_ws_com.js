// DOM
var graphDiv = document.getElementById('acc_graph');
var recorded_lbl = document.getElementById('recorded');
var btn_scroll = document.getElementById('btn-autoscroll');
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

// GLOBAL
var acc_data = {
    x: [],
    y: [],
    z: [],
    timestamp: []
}
var packet_length = 64;
const urlParams = new URLSearchParams(window.location.search);
const topic = urlParams.get('topic');
const baseUrl = window.location.protocol + "//" + window.location.host;
var python_ws_addr = 'ws://' + window.location.host.replace(':7777', ':5556');
var acc_to_send = {};
var acc_to_send_status = 0;
var indeks = 0;
var window_area = 1024 * 4;
var window_size = window_area;
var last_length = 0;
var fft_plot_heigh = 200;

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
    data = [xhistory, yhistory, zhistory];
    Plotly.newPlot('acc_history', data, layout_history);
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
    peaks.forEach(peak => {
        // console.log(peak);
        const annotation = {
            x: parseFloat(peak[0]),
            y: parseFloat(peak[1]),
            text: get_peak_label(parseFloat(peak[0]).toFixed(4), parseFloat(peak[1]).toFixed(4), i),
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
            bgcolor: data.line.color,
            opacity: 0.7
        };
        layout.annotations.push(annotation);
        i++;
    });
    Plotly.newPlot(div, [data], layout, hide_toolbar, {
        staticPlot: true
    });
    layout.annotations = [];
}

const push_acc_data = async (data) => {
    if (data.x_values) {
        data.x_values.forEach(x => {
            acc_data.x.push(parseFloat(x));
        });
    }
    if (data.y_values) {
        data.y_values.forEach(y => {
            acc_data.y.push(parseFloat(y));
        });
    }
    if (data.z_values) {
        data.z_values.forEach(z => {
            acc_data.z.push(parseFloat(z));
        });
    }
    // if (data.timestamp) {
    //         data.timestamp.forEach(z => {
    //         timestamp = z;
    //         date = new Date(timestamp*1000);
    //         formattedDateTime = date.toISOString();
    //         formattedDateTime = String(formattedDateTime.replace('Z',''))
    //         formattedDateTime = String(formattedDateTime.replace('T',' '))
    //         acc_data.timestamp.push(formattedDateTime);
    //     });
    // }
    if (data.timestamp) {
        data.timestamp.forEach(z => {
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

function connect() {
    var ws = new WebSocket(python_ws_addr);
    ws.onopen = function () {
        console.log('terhubung ke socket');
    }
    let fft_beacon = setInterval(() => {
        try {
            if (acc_to_send_status == 1) {
                acc_to_send_status = 0;
                ws.send(JSON.stringify(acc_to_send));
            }
        } catch (error) {
            console.log(error);
        }
    }, 300);
    ws.onmessage = async function (e) {
        data = JSON.parse(e.data)
        var fft_x = {
            x: data.data.x.frequency,
            y: data.data.x.magnitude,
            mode: 'lines',
            type: 'scatter',
            name: 'x',
            line: {
                color: 'rgb(0, 0, 255)',
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
                color: 'rgb(0, 255, 0)',
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
                color: 'rgb(255, 0, 0)',
                width: 2
            }
        };

        if (btn_axis.toggle_x == 1) {
            document.getElementById('fft_graph_x').style.display = 'inline';
            await draw_fft('fft_graph_x', layout_fft.x, fft_x, data.peaks.x);
            new Promise(() => {
                peaks_table.x[0].innerHTML = `${parseFloat(data.peaks.x[0][0]).toFixed(4)}Hz, ${parseFloat(data.peaks.x[0][1]).toFixed(4)}mG`;
                peaks_table.x[1].innerHTML = `${parseFloat(data.peaks.x[1][0]).toFixed(4)}Hz, ${parseFloat(data.peaks.x[1][1]).toFixed(4)}mG`;
                peaks_table.x[2].innerHTML = `${parseFloat(data.peaks.x[2][0]).toFixed(4)}Hz, ${parseFloat(data.peaks.x[2][1]).toFixed(4)}mG`;
            });
        } else {
            document.getElementById('fft_graph_x').style.display = 'none';
        }
        if (btn_axis.toggle_y == 1) {
            document.getElementById('fft_graph_y').style.display = 'inline';
            await draw_fft('fft_graph_y', layout_fft.y, fft_y, data.peaks.y);
            new Promise(() => {
                peaks_table.y[0].innerHTML = `${parseFloat(data.peaks.y[0][0]).toFixed(4)}Hz, ${parseFloat(data.peaks.y[0][1]).toFixed(4)}mG`;
                peaks_table.y[1].innerHTML = `${parseFloat(data.peaks.y[1][0]).toFixed(4)}Hz, ${parseFloat(data.peaks.y[1][1]).toFixed(4)}mG`;
                peaks_table.y[2].innerHTML = `${parseFloat(data.peaks.y[2][0]).toFixed(4)}Hz, ${parseFloat(data.peaks.y[2][1]).toFixed(4)}mG`;
            });
        } else {
            document.getElementById('fft_graph_y').style.display = 'none';
        }
        if (btn_axis.toggle_z == 1) {
            document.getElementById('fft_graph_z').style.display = 'inline';
            await draw_fft('fft_graph_z', layout_fft.z, fft_z, data.peaks.z);
            new Promise(() => {
                peaks_table.z[0].innerHTML = `${parseFloat(data.peaks.z[0][0]).toFixed(4)}Hz, ${parseFloat(data.peaks.z[0][1]).toFixed(4)}mG`;
                peaks_table.z[1].innerHTML = `${parseFloat(data.peaks.z[1][0]).toFixed(4)}Hz, ${parseFloat(data.peaks.z[1][1]).toFixed(4)}mG`;
                peaks_table.z[2].innerHTML = `${parseFloat(data.peaks.z[2][0]).toFixed(4)}Hz, ${parseFloat(data.peaks.z[2][1]).toFixed(4)}mG`;
            });
        } else {
            document.getElementById('fft_graph_z').style.display = 'none';
        }
    };

    ws.onclose = function (e) {
        console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
        clearInterval(fft_beacon);
        setTimeout(function () {
            connect();
        }, 1000);
    };

    ws.onerror = function (err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        ws.close();
    };
}

connect();

socket_io.on(topic, async (data) => {
    // console.log(topic);
    // console.log(data);
    console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)
    data_acc = data;
    if (data_acc.x_values) {
        push_acc_data(data_acc);
        // draw_acc();
    }
});

let history_beacon = setInterval(async () => {
    try {
        update_history();
    } catch (error) {
        console.log(error);
    }
}, 10000);


const draw_acc = async () => {
    try {
        recorded_lbl.innerHTML = `Recorded data: ${acc_data.x.length}, Data in plot: ${0 + indeks} to ${window_area + indeks}`;
        var xTrace = {
            y: acc_data.x.slice(0 + indeks, window_area + indeks),
            text: acc_data.timestamp.slice(0 + indeks, window_area + indeks),
            type: 'scatter',
            mode: 'lines',
            name: 'x',
            line: {
                color: 'rgb(0, 0, 255)',
                width: 1
            }
        };
        var yTrace = {
            y: acc_data.y.slice(0 + indeks, window_area + indeks),
            text: acc_data.timestamp.slice(0 + indeks, window_area + indeks),
            type: 'scatter',
            mode: 'lines',
            name: 'y',
            line: {
                color: 'rgb(0, 255, 0)',
                width: 1
            }
        };
        var zTrace = {
            y: acc_data.z.slice(0 + indeks, window_area + indeks),
            text: acc_data.timestamp.slice(0 + indeks, window_area + indeks),
            type: 'scatter',
            mode: 'lines',
            name: 'z',
            line: {
                color: 'rgb(255, 0, 0)',
                width: 1
            }
        };
        var plotData = [];
        if (btn_axis.toggle_x == 1) plotData.push(xTrace);
        if (btn_axis.toggle_y == 1) plotData.push(yTrace);
        if (btn_axis.toggle_z == 1) plotData.push(zTrace);

        if (acc_data.x.length !== last_length && autoscroll_status == 1) {
            if (acc_data.x.length > window_area) {
                indeks += packet_length;
                acc_to_send['x'] = xTrace.y;
                acc_to_send['y'] = yTrace.y;
                acc_to_send['z'] = zTrace.y;
                acc_to_send['peaks_req'] = 3;
                acc_to_send_status = 1;
                Plotly.newPlot('acc_graph', plotData, layout);
            } else {
                Plotly.newPlot('acc_graph', plotData, layout);
            }
            last_length = acc_data.x.length;
        }
    } catch (error) {
        console.log(error);
    }
}

let animation_pointer = 0;

const update_recv_data_info = async (index) => {
    try {
        recorded_lbl.innerHTML = `Recorded data: ${acc_data.x.length}, Data in plot: ${0 + indeks} to ${window_area + indeks}`;
    } catch (error) {
        console.error(error);
    }
}
const animate_acc = async (index) => {
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
        var plotData = [];

        // if (autoscroll_status == 1) {
        if (btn_axis.toggle_x == 1) plotData.push(xTrace);
        if (btn_axis.toggle_y == 1) plotData.push(yTrace);
        if (btn_axis.toggle_z == 1) plotData.push(zTrace);
        acc_to_send['x'] = xTrace.y;
        acc_to_send['y'] = yTrace.y;
        acc_to_send['z'] = zTrace.y;
        acc_to_send['peaks_req'] = 3;
        acc_to_send_status = 1;
        Plotly.newPlot('acc_graph', plotData, layout);
        if (zTrace.y.length >= window_size) {
            let delta = acc_data.timestamp.length - animation_pointer;
            let SP = parseInt(window_size)
            if (delta > SP) {
                let error = delta - SP;
                animation_pointer += parseInt(error / 10);
            } else {
                animation_pointer += 1;
            }
        }
        // }
    } catch (error) {
        console.error('something error:', error);
    }
}


setInterval(() => {
    // if (acc_data.x.length > animation_pointer && (acc_data.x.length) > (window_size)) {
    //     animate_acc(animation_pointer);
    // }
    if (acc_data.x.length > animation_pointer) {
        animate_acc(animation_pointer);
    }
}, 50);

setInterval(() => {
    update_recv_data_info(animation_pointer);
}, 1000);


// DOM events
btn_scroll.onclick = () => {
    if (autoscroll_status === 1) {
        autoscroll_status = 0;
        btn_scroll.className = 'btn btn-disable btn-md'
    } else {
        autoscroll_status = 1;
        btn_scroll.className = 'btn btn-primary btn-md'
    }
}

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

let isDragging = false;
let offsetX, offsetY;
draggable.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - draggable.getBoundingClientRect().left;
    offsetY = e.clientY - draggable.getBoundingClientRect().top;
    draggable.style.cursor = "grabbing";
});
document.addEventListener("mousemove", async (e) => {
    if (isDragging) {
        draggable.style.left = e.clientX - offsetX + "px";
        draggable.style.top = e.clientY - offsetY + "px";
    }
});
document.addEventListener("mouseup", async () => {
    if (isDragging == true) {
        draggable.style.cursor = "grab";
    }
    isDragging = false;
});
