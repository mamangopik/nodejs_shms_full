var device_container = document.getElementById("device-containers");
var btn_cancel = document.getElementById('btn-cancel');
var btn_save = document.getElementById('btn-save');
var tb_name = document.getElementById('tb_name');
var tb_type = document.getElementById('tb_type');
var tb_topic = document.getElementById('tb_topic');
var btn_add = document.getElementById('btn-add');
var btn_confirm_delete = document.getElementById('btn-confirm-delete');
var btn_logout = document.getElementById('btn-logout');
const toggleSwitch = document.getElementById("myToggle");
var node_id_to_delete = {
	label: document.getElementById('node_id_to_delete'),
	id: document.getElementById('tb_node_id_to_delete')
};


var edit_prop = {
	type: [],
	name: [],
	topic: [],
	id: [],
	log_raw:[]
};
var nodes_dom = [];
var delete_buttons = [];
var mode = 'add';
var update_id = '';

var log_raw_data_buf = 0;

const baseUrl = window.location.protocol + "//" + window.location.host;

const replaceSpecialCharsWithHyphen = (inputString) => {
	// Use the replace method with a regular expression to replace special characters and non-ASCII characters with hyphens
	return inputString.replace(/[^\x00-\x7F; ]/g, '-');
}
const add_device = () => {

	const jsonData = {
		type: tb_type.value,
		name: tb_name.value,
		topic: replaceSpecialCharsWithHyphen(tb_topic.value)
	};

	console.log(jsonData);
	if (jsonData.type.length > 0 && jsonData.topic.length > 0 && jsonData.name.length > 0) {
		fetch(baseUrl + '/api/devices/add', {
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
				draw_node_list();
			})
			.catch(error => {
				console.error('There was a problem with the fetch operation:', error);
			});
	} else {
		alert('incomplete inputs');
	}

};

const update_device = (id) => {
	const jsonData = {
		type: tb_type.value,
		name: tb_name.value,
		topic: replaceSpecialCharsWithHyphen(tb_topic.value),
		log_raw : log_raw_data_buf,
        id:id
	};
	if (jsonData.type.length > 0 && jsonData.topic.length > 0 && jsonData.name.length > 0) {
		fetch(baseUrl + '/api/devices/update', {
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
				draw_node_list();
			})
			.catch(error => {
				console.error('There was a problem with the fetch operation:', error);
			});
	} else {
		alert('incomplete inputs');
	}

};

const remove_device = () => {
	const jsonData = {
		id: node_id_to_delete.id.value
	};
	fetch(baseUrl + '/api/devices/remove', {
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
			draw_node_list();
		})
		.catch(error => {
			console.error('There was a problem with the fetch operation:', error);
			draw_node_list();
		});

};

const draw_node_list = () => {
	var edit_prop = {
		type: [],
		name: [],
		topic: [],
		id: [],
		log_raw:[]
	};
	var nodes_dom = [];
	var delete_buttons = [];


	fetch(baseUrl + '/api/devices')
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json(); // Parse the response body as JSON
		})
		.then(data => {
			// Work with the JSON data here
			console.log(data);
            device_container.innerHTML = '';
            document.getElementById('btn-cancel').click();
			data.data.forEach(element => {
				edit_prop.name.push(element.name);
				edit_prop.type.push(element.type);
				edit_prop.topic.push(element.topic);
				edit_prop.id.push(element.id);
				edit_prop.log_raw.push(element.log_raw);
				nodes_dom.push(`edit_url_${element.id}`);
				delete_buttons.push(`delete_url_${element.id}`);
				device_container.innerHTML +=	
					`<div class="col-md-4 jumboron">
                    <ul class="list-group">
                        <li class="list-group-item">
                            <div class="row">
                                <a href="#delete" data-toggle="modal" data-target="#deleteModal" id="delete_url_${element.id}">
                                    <img width="20" height="20" src="/images/delete.png" alt="delete">
                                </a>
                                <a href="#update" data-toggle="modal" data-target="#exampleModal" id="edit_url_${element.id}">
                                    <img width="20" height="20" src="/images/edit.png" alt="edit">
                                </a>
                                <a href="${baseUrl}/realtime_graph/${element.type}?topic=${element.topic}" target="_blank">
                                    <img width="20" height="20" src="/images/open.png" alt="open">
                                </a>                
                            </div>
                            <br>
                            <h4 class="list-group-item-heading">${element.name}</h4>
                            <p class="list-group-item-text">
                                <strong>Data Type:</strong> ${element.type}<br>
                                <strong>Name:</strong> ${element.name}<br>
                                <strong>Topic:</strong> ${element.topic}<br>
								<strong>Log Raw Data:</strong> ${Boolean(element.log_raw)}<br><br>
                                <strong>ID:</strong> ${element.id}<br><br>
                            </p>
                        </li>
                    </ul>
                </div>`
			});
			nodes_dom.forEach(function(id, index) {
				var element = document.getElementById(id);
				if (element) {
					element.addEventListener("click", function() {
                        mode = "update";
						console.log(id);
						console.log("test")
                        update_id = edit_prop.id[index];
						document.getElementById('edit-modal-lbl').innerHTML = "Edit Node Properties";
						tb_name.value = edit_prop.name[index];
						tb_type.value = edit_prop.type[index];
						tb_topic.value = edit_prop.topic[index];
						log_raw_data_buf = edit_prop.log_raw[index];
						toggleSwitch.addEventListener("change", () => {
							if (toggleSwitch.checked) {
								log_raw_data_buf = 1;
							} else {
								log_raw_data_buf = 0;
							}
						});
						if(edit_prop.type[index]=="accelerometer"){
							document.getElementById("acc-toggle-switch").style.display='inline-block';
						}else{
							document.getElementById("acc-toggle-switch").style.display='none';
						}

						if(edit_prop.log_raw[index]==1){
							toggleSwitch.checked = true;
							document.getElementsByClassName('toggle-switch-handle')[0].style.left='30px';
							document.getElementsByClassName('toggle-switch')[0].style.backgroundColor='#168bff';
						}else{
							toggleSwitch.checked = false;
							document.getElementsByClassName('toggle-switch-handle')[0].style.left='0px';
							document.getElementsByClassName('toggle-switch')[0].style.backgroundColor='#ccc';
						}
					});
				}
			});

			delete_buttons.forEach(function(id, index) {
				var delete_element = document.getElementById(id);
				if (delete_element) {
					delete_element.addEventListener("click", function() {
						node_id_to_delete.label.innerHTML = `Remove node:"<i>${edit_prop.id[index]}</i>" ?`;
						node_id_to_delete.id.value = edit_prop.id[index];
						console.log(node_id_to_delete.id.value);
					});
				}
			});
		})
		.catch(error => {
			console.error('There was a problem with the fetch operation:', error);
		});
}

// Function to delete a cookie by name
function deleteCookie(cookieName) {
    // Set the expiration date to a date in the past (1 January 1970)
	document.cookie = cookieName + '=; Max-Age=0'
}


window.onload = ()=>{
    draw_node_list();
	document.getElementById("url-device").href=baseUrl+'/devices';
	document.getElementById("url-setup").href=baseUrl+'/config';
}

btn_add.onclick = () => {
    mode = 'add';
	document.getElementById('edit-modal-lbl').innerHTML = "Add new node";
	tb_name.value = '';
	tb_type.value = '';
	tb_topic.value = '';
}

btn_logout.onclick = ()=>{
	deleteCookie("login_info");
	window.location = baseUrl;
}

btn_save.onclick = () => {
    if(mode == "add"){
        add_device();
    }
    else{
        update_device(update_id);
    }
    document.getElementById('btn-cancel').click();
}

btn_confirm_delete.onclick = () => {
	remove_device();
    document.getElementById('btn-cancel-remove').click();
}


toggleSwitch.addEventListener("change", () => {
    if (toggleSwitch.checked) {
        document.getElementsByClassName('toggle-switch-handle')[0].style.left='30px';
		document.getElementsByClassName('toggle-switch')[0].style.backgroundColor='#168bff';
        console.log("Switch is on");
    } else {
        document.getElementsByClassName('toggle-switch-handle')[0].style.left='0px';
		document.getElementsByClassName('toggle-switch')[0].style.backgroundColor='#ccc';
        console.log("Switch is off");
    }
});
