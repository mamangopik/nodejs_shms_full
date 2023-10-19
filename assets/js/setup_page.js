// JavaScript to update the displayed value as the slider is moved
const baseUrl = window.location.protocol + "//" + window.location.host;

const freq_slider = document.getElementById("freq-floating-slider");
const freq_output = document.getElementById("freq-slider-value");

const acc_slider = document.getElementById("acc-floating-slider");
const acc_output = document.getElementById("acc-slider-value");

document.getElementById("url-device").href=baseUrl+'/devices';
document.getElementById("url-setup").href=baseUrl+'/config';

freq_slider.addEventListener("input", function () {
   freq_output.textContent = freq_slider.value;
});

acc_slider.addEventListener("input", function () {
   acc_output.textContent = acc_slider.value;
});