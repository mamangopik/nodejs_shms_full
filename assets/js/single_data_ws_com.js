// DOM
var graphDiv = document.getElementById('history_graph');
// GLOBAL
var instrument_name = "";
var label = ""
var label_kf = ""
var window_size = 1024;
var animation_pointer = 0;
var collected_data = {
    timestamp: [],
    value: []
}

var collected_data_kf = {
    timestamp: [],
    value: []
}

const toolbar = {
    modeBarButtonsToRemove: ['autoScale2d']
}

const urlParams = new URLSearchParams(window.location.search);
var device_id = urlParams.get('id');
const topic = urlParams.get('topic');

var layout = {
    height: 500,
    autosize: true,
    title: 'Data Time Domain VIBRASi',
    yaxis: {
        title: 'Value',
    },
    xaxis: {
        title: 'Waktu'
    },
    showlegend: true
};

var layout_kf = {
    height: 500,
    autosize: true,
    title: 'Data Time Domain VIBRASi',
    yaxis: {
        title: 'Value',
    },
    xaxis: {
        title: 'Waktu'
    },
    showlegend: true,
    line: {
        color: 'rgb(100, 0, 255)',
        width: 2
    }
};


// Functions
const getHwInfo = async () => {
    let xhr = new XMLHttpRequest();
    const baseUrl = window.location.protocol + "//" + window.location.host;
    let thisurl = `${baseUrl}/api/recorded_device/`;
    let title_bar = document.getElementById("title-bar");
    console.log(title_bar.innerText)
    console.log(thisurl);
    xhr.open('GET', thisurl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var response = JSON.parse(xhr.responseText);
            response.forEach(data => {
                if (data.id == device_id) {
                    try {
                        title_bar.innerHTML += data.name;
                        instrument_name = data.name;
                    } catch (error) {

                    }
                }
            });
        } else {
            console.warn("error to get data from API");
        }
    };
    xhr.send();
}

const animate_data = async (index, setInterval_id) => {
    try {
        var dtrace = {
            y: collected_data.value.slice(index, index + window_size),
            text: collected_data.timestamp.slice(index, index + window_size),
            type: 'scatter',
            mode: 'lines',
            name: 'y KF',
            line: {
                color: 'rgb(63, 56, 245)',
                width: 1
            }
        };
        var kfdtrace = {
            y: collected_data_kf.value.slice(index, index + window_size),
            text: collected_data_kf.timestamp.slice(index, index + window_size),
            type: 'scatter',
            mode: 'lines',
            name: 'z KF',
            line: {
                color: 'rgb(196, 41, 2)',
                width: 1
            }
        };
        var plotData = [];
        var plotDatakf = [];

        // if (btn_axis.toggle_x == 1) plotData.push(xTrace);
        // if (btn_axis.toggle_x == 1) plotDatakf.push(xkfTrace);

        plotData.push(dtrace);
        plotData.push(kfdtrace);

        if (dtrace.y.length >= window_size) {
            let delta = collected_data.timestamp.length - animation_pointer;
            let SP = parseInt(window_size)
            if (delta > SP) {
                let error = delta - SP;
                animation_pointer += parseInt(error / 10);
                Plotly.newPlot('data_graph', plotData, layout, { renderer: 'webgl' });
                acc_to_send_status = 1;
            } else {
                animation_pointer += 1;
            }
        }
        else {
            Plotly.newPlot('data_graph', plotData, layout, { renderer: 'webgl' });
        }
    } catch (error) {
        console.error('something error:', error);
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

// const draw_history = async (label, label_kf) => {
//     var data_history = {
//         y: collected_data.value,
//         text: collected_data.timestamp,
//         type: 'scatter',
//         mode: 'lines',
//         name: label,
//         line: {
//             color: 'rgb(63, 56, 245)',
//             width: 2
//         }
//     };
//     var data_history_kf = {
//         y: collected_data_kf.value,
//         text: collected_data_kf.timestamp,
//         type: 'scatter',
//         mode: 'lines',
//         name: label_kf,
//         line: {
//             color: 'rgb(196, 41, 2)',
//             width: 2
//         }
//     };
//     data = [data_history, data_history_kf];
//     Plotly.newPlot('history_graph', data, layout);
// }

// const draw_history_kf = async (label) => {
// var data_history_kf = {
//     y: collected_data_kf.value,
//     text: collected_data_kf.timestamp,
//     type: 'scatter',
//     mode: 'lines',
//     name: label,
// };
// data = [data_history];
// Plotly.newPlot('kf_history_graph', data, layout_kf);
// }
// SOCKET
const baseUrl = window.location.protocol + "//" + window.location.host;
console.log('aa')
var socket_io = io.connect(baseUrl);

const push_data = async (data) => {
    data_var = data;
    unfiltered_data = data_var.values.raw;
    filtered_data = data_var.values.filtered;
    let i = 0;
    unfiltered_data.forEach(data_raw => {
        collected_data.value.push(data_raw);
        collected_data.timestamp.push(data_var.timestamp + (20 * i));
        i++;
    });
    filtered_data.forEach(data_filtered => {
        collected_data_kf.value.push(data_filtered);
        collected_data_kf.timestamp.push(data_var.timestamp + (20 * i));
        i++;
    });
}
socket_io.on(topic, async (data) => {
    console.log(data);
    label = data.label
    label_kf = 'filtered_' + data.label;
    push_data(data);
});
// DOM events

setInterval(async () => {
    var data_history = {
        y: collected_data.value,
        text: collected_data.timestamp,
        type: 'scatter',
        mode: 'lines',
        name: label,
        line: {
            color: 'rgb(63, 56, 245)',
            width: 2
        }
    };
    var data_history_kf = {
        y: collected_data_kf.value,
        text: collected_data_kf.timestamp,
        type: 'scatter',
        mode: 'lines',
        name: label_kf,
        line: {
            color: 'rgb(196, 41, 2)',
            width: 2
        }
    };
    data = [data_history, data_history_kf];
    Plotly.newPlot('history_graph', data, layout);
}, 10000)

animation_id = setInterval(() => {
    if (collected_data.value.length > animation_pointer) {
        animate_data(animation_pointer);
    }
}, 200);

window.onload = async () => {
    await getHwInfo();
};

document.getElementById('btn-set-cf').onclick = () => {
    let cf = document.getElementById('cf-input').value;
    let message = JSON.stringify({
        'topic': topic, 'cf_value': String(cf)
    });
    console.log(message)
    socket_io.emit("callibration_factor", message);
}