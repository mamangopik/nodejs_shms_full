// DOM
var graphDiv = document.getElementById('history_graph');
// GLOBAL

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
const topic = urlParams.get('topic');

var layout = {
    height: 500,
    autosize: true,
    title: 'Data Time Domain VIBRASi',
    yaxis: {
        title: 'Acc',
    },
    xaxis: {
        title: 'Waktu'
    },
    showlegend: true
};


// Functions
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

const draw_history = async (label) => {
    var data_history = {
        y: collected_data.value,
        text: collected_data.timestamp,
        type: 'scatter',
        mode: 'lines',
        name: label,
    };
    data = [data_history];
    Plotly.newPlot('history_graph', data, layout);
}

const draw_history_kf = async (label) => {
    var data_history = {
        y: collected_data_kf.value,
        text: collected_data_kf.timestamp,
        type: 'scatter',
        mode: 'lines',
        name: label,
    };
    data = [data_history];
    Plotly.newPlot('kf_history_graph', data, layout);
}
// SOCKET
const baseUrl = window.location.protocol + "//" + window.location.host;
console.log('aa')
var socket_io = io.connect(baseUrl);

socket_io.on(topic, async (data) => {
    console.log(data);
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
    draw_history(data_var.label);
    draw_history_kf('filtered_' + data_var.label);
    console.log(data_var);
});
// DOM events
