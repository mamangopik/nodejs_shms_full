// JavaScript to update the displayed value as the slider is moved
const baseUrl = window.location.protocol + "//" + window.location.host;

const freq_slider = document.getElementById("freq-floating-slider");
const freq_output = document.getElementById("freq-slider-value");

const acc_slider = document.getElementById("acc-floating-slider");
const acc_output = document.getElementById("acc-slider-value");

const btn_save = document.getElementById("btn-save");


const tb_addr = document.getElementById("tb-addr");
const tb_token = document.getElementById("tb-token");
const tb_logging_interval = document.getElementById("tb-logging-interval");
const tb_sampling_duration = document.getElementById("tb-sampling-duration");

document.getElementById("url-device").href=baseUrl+'/devices';
document.getElementById("url-setup").href=baseUrl+'/config';

freq_slider.addEventListener("input", function () {
   freq_output.textContent = freq_slider.value;
});

acc_slider.addEventListener("input", function () {
   acc_output.textContent = acc_slider.value;
}); 



fetch(baseUrl + '/api/monitoring/get_config')
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json(); // Parse the response body as JSON
		})
		.then(data => {
            data = data.data;
			   console.log(data);
            freq_output.textContent = `${data.freq_thres}`;
            freq_slider.value=`${data.freq_thres}`;
            acc_output.textContent = `${data.acc_thres}`;
            acc_slider.value=`${data.acc_thres}`;
         }
      )

const update_config = (id) => {
	const jsonData = {
		cloud_address:tb_addr.value,
		token:tb_token.value,
		log_interval:tb_logging_interval.value,
		sampling_duration:tb_sampling_duration.value,
		freq_thres:freq_slider.value,
		acc_thres:acc_slider.value
	};
	if (jsonData.token.length > 0) {
		fetch(baseUrl + '/api/monitoring/set_config', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(jsonData),
			})
			.then(response => {
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				return response.json();
			})
			.then(data => {
				console.log(data);
				window.location.reload();
			})
			.catch(error => {
				console.error('There was a problem with the fetch operation:', error);
			});
	} else {
		alert('incomplete inputs');
	}

};

btn_save.onclick = ()=>{
   update_config();
}