var pages = 0;
var offset_db = pages * 100;
var btn_logout = document.getElementById("btn-logout");
var btn_download = document.getElementById('downloadButton');
var baseURL = window.location.protocol + "//" + window.location.host;
var select_node_dropdown = document.getElementById("select-node");
var timepicker = document.getElementById("timepicker");
var datepicker = document.getElementById("datepicker");
var btn_process = document.getElementById("btn-process");
var display_page = document.getElementById("display-page");
var graphDiv = document.getElementById('myDiv');
var data_timestamp = [];
var data_datetime = [];
var acc_x = [];
var acc_y = [];
var acc_z = [];
var data_id = [];
var data_log_array = [];
var xMin = 0;
var xMax = 0;
var fft_value = {};
var data_to_request = 0;
var ready_animate = 0;
var offset_display = 0;
var display_step = 10000;
var last_xpos = [];
var load_success = 0;


var acc_data_to_calculate = {
	x: [],
	y: [],
	z: [],
};

datepicker.valueAsDate = new Date();

// URL API yang akan diakses
const nodeUrl = baseURL + "/get_nodes";
console.log(nodeUrl);
console.log(offset_db);

function convertArrayToCSV(array) {
	let csvContent = '';

	array.forEach((row) => {
		const rowString = row.join(';');
		csvContent += rowString + '\n';
	});

	return csvContent;
}

function downloadCSV() {
	if (data_id.length >= 10) {
		const csvData = convertArrayToCSV(data_log_array);
		document.getElementById('csvData').innerText = csvData;
		const downloadLink = document.createElement('a');
		downloadLink.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData));
		downloadLink.setAttribute('download', 'data' + data_datetime[0] + '_page' + (pages + 1) + '.csv');
		downloadLink.style.display = 'none';
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
	} else {
		alert('data empty');
	}
}

function draw_fft_value() {
	var fft_x = {
		text: data_datetime,
		x: fft_value['x']['frequency'],
		y: fft_value['x']['magnitude'],
		mode: 'lines',
		type: 'scatter',
		name: 'x',
	};
	var fft_y = {
		text: data_datetime,
		x: fft_value['y']['frequency'],
		y: fft_value['y']['magnitude'],
		mode: 'lines',
		type: 'scatter',
		name: 'y',
	};
	var fft_z = {
		text: data_datetime,
		x: fft_value['z']['frequency'],
		y: fft_value['z']['magnitude'],
		mode: 'lines',
		type: 'scatter',
		name: 'z',
	};
	const layout2 = {
		height: 500,
		title: 'Data FFT SIMON BATAPA',
		yaxis: {
			title: 'Mag (g)',
		},
		xaxis: {
			title: 'Frequency (Hz)',
		},
		showlegend: true,
	};
	var data_plot2 = [fft_x, fft_y, fft_z];
	Plotly.newPlot('myDiv2', data_plot2, layout2);

	// Add annotations for highest values on each axis
	var annotations = [];

	['x', 'y', 'z'].forEach(axis => {
		var maxIndex = fft_value[axis]['magnitude'].indexOf(Math.max(...fft_value[axis]['magnitude']));
		annotations.push({
			x: fft_value[axis]['frequency'][maxIndex],
			y: fft_value[axis]['magnitude'][maxIndex],
			text: `Puncak ${axis.toUpperCase()} Axis<br>Freq: ${fft_value[axis]['frequency'][maxIndex]}<br>Mag: ${fft_value[axis]['magnitude'][maxIndex].toFixed(2)}`,
			showarrow: true,
			arrowhead: 2,
			ax: 0,
			ay: -40
		});
	});

	layout2.annotations = annotations;

	Plotly.update('myDiv2', layout2);
}

function request_acc_data(sender=null) {
  try {
    sender.style.visibility='hidden';
  } catch (error) {
    console.log(error);
  }
	let selectedTime = timepicker.value;
	let selectedDate = datepicker.value;
	let exactDate = selectedDate + ' ' + selectedTime;
	let exactDateTimestamp = new Date(exactDate).getTime();
	let apiUrl = baseURL + "/get_acc?node=" + select_node_dropdown.value + "&start=" + (exactDateTimestamp / 1000) + "&offset=" + offset_db + '&limit=' + display_step;
	// let apiUrl = 'http://simonbatapa.local:5555/get_acc?node=node_99&start=1689008400&offset=0';
	let xhr = new XMLHttpRequest();
	console.log(apiUrl);
	fetch(apiUrl)
		.then(response => {
			if (!response.ok) {
				throw new Error("Network response was not ok");
			}
			return response.json();
		})
		.then(data => {
			console.log(data.data);
			data_log_array = [
				['id', 'date_time', 'x', 'y', 'z']
			];
			data_to_request = parseInt(data['total_data_length'] * 1);
			data_array = data.data;
			for (let i = 0; i < data_array.length; i++) {
				acc_x.push(parseFloat(data_array[i]['x']));
				acc_y.push(parseFloat(data_array[i]['y']));
				acc_z.push(parseFloat(data_array[i]['z']));
				data_timestamp.push(parseFloat(data_array[i]['unix_timestamp']));
				data_datetime.push(data_array[i]['date_time']);
			}
      for (let i = 0; i < data_array.length; i++) {
        data_id.push(parseInt(i+1)+parseInt(display_step*load_success));
			}
      console.log(data_id[data_id.length-1]);
			console.log(acc_x);
			update_plot();
      load_success++;
      sender.style.visibility='visible';
			if (acc_x.length >= display_step) {
				offset_db += display_step;
				for (let i = 0; i < data_id.length; i++) {
					let buff = [data_id[i], data_datetime[i], acc_x[i], acc_y[i], acc_z[i]];
					data_log_array.push(buff);
				}
			}
		})
		.catch(error => {
			// Handle errors here
			console.log('error');
		});
}

function request_fft_data(payload) {
	json_data = JSON.stringify(payload);
	let link = baseURL.replace(':8888', ':8889');
	console.log(link);
	fetch(link, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: json_data
		})
		.then(response => response.json())
		.then(data => {
			fft_value = data['data'];
			draw_fft_value();
		})
		.catch(error => {
			console.error('Terjadi kesalahan:', error);
		});
}

function update_plot() {
	var x = {
		text: data_datetime,
		y: acc_x,
    // x:data_id,
		mode: 'lines',
		type: 'scatter',
		name: 'x',
	};
	var y = {
		text: data_datetime,
		y: acc_y,
    // x:data_id,
		mode: 'lines',
		type: 'scatter',
		name: 'y',
	};
	var z = {
		text: data_datetime,
		y: acc_z,
    // x:data_id,
		mode: 'lines',
		type: 'scatter',
		name: 'z',
	};
	const layout = {
		height: 500,
		title: 'Data Accelerometer SIMON BATAPA',
		yaxis: {
			title: 'Acc',
		},
		xaxis: {
			title: 'Waktu',
			range: [offset_display, (offset_display + display_step)]
		},
		showlegend: true
	};
	const toolbar = {
		modeBarButtonsToRemove: ['autoScale2d']
	}
	var data_plot = [x, y, z];
	Plotly.newPlot('myDiv', data_plot, layout, toolbar);
	var graphDiv = document.getElementById('myDiv');
	graphDiv.on('plotly_relayout', function(eventdata) {
		var gd = document.getElementById('myDiv');
		var xRange = gd.layout.xaxis.range;
		var yRange = gd.layout.yaxis.range;
    // acc_data_to_calculate = acc
    console.log(xRange);
		gd.data.forEach(function(trace) {
      // console.log(trace);
			var len = Math.min(trace.y.length);
			var xInside = [];
			var yInside = [];
			for (var i = 0; i < len; i++) {
				var y = trace.y[i];
				if (y > yRange[0] && y < yRange[1]) {
					yInside.push(y);
				}
			}
			acc_data_to_calculate[trace['name']] = yInside;
			let xmin = eventdata['xaxis.range[0]']
			pages = Math.abs(parseInt(Math.ceil(xmin / display_step)));
			offset_display = pages * display_step;
		});
		request_fft_data(acc_data_to_calculate);
	});

}

window.onload = function() {
	let xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4 && xhr.status === 200) {
			const data = JSON.parse(xhr.responseText);
			data_array = data['nodes'];
			let html_text = "";
			for (let i = 0; i < data_array.length; i++) {
				html_text += `<option value="` + data_array[i]['node_name'] + `">Node ` + (i + 1) + `</option>`;
			}
			select_node_dropdown.innerHTML = html_text;
		} else if (xhr.readyState === 4) {
			console.error('Error:', xhr.status, xhr.statusText);
		}
	};
	xhr.open('GET', nodeUrl, true);
	xhr.send();
}


btn_process.onclick = function() {
	request_acc_data(this);
	content_cek = setInterval(() => {
		if (acc_x.length) {
			if (ready_animate == 0) {
				this.innerHTML = 'Load more' + ('&nbsp;'.repeat(4));
				btn_download.style.visibility = 'visible';
				btn_logout.style.visibility = 'visible';
			}
			ready_animate = 1;
		}
	}, 100);
};

btn_process.addEventListener('mouseenter', function() {
	if (ready_animate) startAnimation(this);
});

btn_logout.onclick = function() {
	window.location = baseURL + '/logout';
};

btn_process.addEventListener('mouseleave', function() {
	if (ready_animate) stopAnimation(this);
});

function startAnimation(button) {
	let counter = 0;
	animationInterval = setInterval(() => {
		let dots = '.'.repeat(counter);
		button.innerHTML = 'Load more' + dots + '&nbsp;'.repeat(4 - (counter));
		counter++;
		if (counter > 4) counter = 0;
	}, 300);
}

function stopAnimation(button) {
	clearInterval(animationInterval);
	button.innerHTML = 'Load more' + ('&nbsp;'.repeat(4));
}