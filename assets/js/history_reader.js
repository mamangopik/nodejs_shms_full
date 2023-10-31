// DOM
var graphDiv = document.getElementById('acc_graph');
var btn_request = document.getElementById('req-data');

// GLOBAL
var acc_data={
    x:[],
    y:[],
    z:[],
    timestamp:[]
}
const urlParams = new URLSearchParams(window.location.search);
const topic = urlParams.get('topic'); 
const baseUrl = window.location.protocol + "//" + window.location.host;
var python_ws_addr = 'ws://'+window.location.host.replace(':7777',':5556');
var acc_to_send = {};
var acc_to_send_status = 0;
var indeks = 0;
var step = 2048;
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

var layout_fft={
    'x':{
        height: fft_plot_heigh,
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
    'y':{
        height: fft_plot_heigh,
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
    'z':{
        height: fft_plot_heigh,
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


const draw_fft = async (div,layout,data,peaks)=>{
    let i=1;
    peaks.forEach(peak => {
        // console.log(peak);
        const annotation = {
            x: parseFloat(peak[0]),
            y: parseFloat(peak[1]),
            text: get_peak_label(parseFloat(peak[0]).toFixed(4),parseFloat(peak[1]).toFixed(4),i),
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
              opacity: 0.8
        };
        layout.annotations.push(annotation);
        i++;
    });
    Plotly.newPlot(div, [data], layout, hide_toolbar);
    layout.annotations=[];
}

const draw_acc = async (payload)=>{
    let time_data_buff=[]
    let x_buff=[]
    let y_buff=[]
    let z_buff=[]

    payload.time_data.forEach(element=>{
        let times = JSON.parse(element);
        new Promise(()=>{
            times.forEach(time=>{
                time_data_buff.push(time)
            })
        })
    })
    payload.json.forEach(element=>{
        let json = JSON.parse(element)
        new Promise(()=>{
            json.x_values.forEach(x => {
                new Promise(()=>{
                    x_buff.push(x)
                })
            })
    
            json.y_values.forEach(y => {
                new Promise(()=>{
                    y_buff.push(y)
                })
            })
    
            json.z_values.forEach(z => {
                new Promise(()=>{
                    z_buff.push(z)
                })
            })
        })
    })
    new Promise(()=>{
        var xTrace = {
            y: x_buff,
            text: time_data_buff,
            type: 'scatter',
            mode: 'lines',
            name: 'x',
            line: {
                color: 'rgb(0, 0, 255)',
                width: 1
            }
        };
        var yTrace = {
            y: y_buff,
            text: time_data_buff,
            type: 'scatter',
            mode: 'lines',
            name: 'y',
            line: {
                color: 'rgb(0, 255, 0)',
                width: 1
            }
        };
        var zTrace = {
            y: z_buff,
            text: time_data_buff,
            type: 'scatter',
            mode: 'lines',
            name: 'z',
            line: {
                color: 'rgb(255, 0, 0)',
                width: 1
            }
        };
        var plotData =[xTrace,yTrace,zTrace];
        Plotly.newPlot('acc_graph', plotData, layout);
    })
}



btn_request.onclick = async ()=>{
    // Definisikan URL endpoint
    const endpointURL = "http://brains.local:7777/get_acc?node=/shms/node_3/accelerometer&start=1616166161&offset=0&limit=50000";

    // Gunakan Fetch API untuk mengambil data
    fetch(endpointURL)
    .then(response => {
        if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json(); // Mengambil response sebagai JSON
    })
    .then(data => {
        // Handle data yang diterima dari endpoint di sini
        console.log("Data yang diterima:", data);
        draw_acc(data);
    })
    .catch(error => {
        // Tangani kesalahan jika ada
        console.error("Kesalahan:", error);
    });
}
