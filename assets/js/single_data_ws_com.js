// DOM
var graphDiv = document.getElementById('history_graph');
// GLOBAL

var collected_data={
    timestamp:[],
    value:[]
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
const download = async ()=>{
    var csvContent = "id,x,y,z,date_time(UTC+0)\n";
    for (var i = 0; i < acc_data.x.length; i++) {
        csvContent += `${i + 1},${acc_data.x[i]},${acc_data.y[i]},${acc_data.z[i]},${acc_data.timestamp[i]}\n`;
    }
    // Create a Blob with the CSV data
    var blob = new Blob([csvContent], { type: 'text/csv' });
    // Create a download link
    var a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = `${acc_data.timestamp[acc_data.x.length-1]}_acc_data.csv`;
    a.style.display = 'none';
    // Append the link to the body and trigger the download
    document.body.appendChild(a);
    a.click();
    // Clean up
    document.body.removeChild(a);
}

const draw_history = async (label)=>{
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
// SOCKET
const baseUrl = window.location.protocol + "//" + window.location.host;
var socket_io = io.connect(baseUrl);

socket_io.on(topic, async (data) => {
    console.log(data);
    data_var = data;
    collected_data.value.push(data_var.value);
    collected_data.timestamp.push(data_var.timestamp);
    draw_history(data_var.label);
    console.log(data_var);
});
// DOM events
