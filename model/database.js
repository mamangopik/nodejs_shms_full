const { query } = require('express');
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'hisafa',
  password: 'janganlupa',
  database: 'simon_batapa'
}).promise();

const user_validation = async(email,password)=>{
  const query = `SELECT * FROM akun WHERE email = '${email}' AND password = '${password}'`;
  const [result] = await pool.query(query);
  console.log(result);
  if (result.length >= 1) return true;
  else return false;
}

const get_nodes = async  () => {
  const [result] = await pool.query("SELECT DISTINCT node_name FROM acc_data_log");
  return result;
}

const user_register = async (email,password)=>{
  const query = `INSERT INTO akun (email, password, status)
  VALUES ('${email}', '${password}', 1);`;
  const [result] = await pool.query(query);
  console.log(result);
}

const get_acc = async  (query) => {
    const [result] = await pool.query(query);
    return result;
}

const node_data_len = async  (node) => {
    const query = "SELECT count(*) FROM `acc_data_log` WHERE node_name = '"+node+"';";
    const result = await pool.query(query);
    return result[0][0]['count(*)'];
}

const log_data = async (payload) => {
    meassurement_data = JSON.stringify(payload.meassurement_data);
    timestamp_data = JSON.stringify(payload.time_data);
    const query = `INSERT INTO data_log (unix_timestamp, json, node,time_data)
                   VALUES (${parseInt(payload.timestamp)},'${meassurement_data}','${payload.node}','${timestamp_data}'); `
    console.log(payload)
    const result = await pool.query(query);
    console.log('data logged');
    return 1
}

const read_data_bundle = async (node,unix,limit,offset) => {
  const query = `select * from data_log where node='${node}' and unix_timestamp>=${unix} limit ${limit} offset ${offset};`
  const [result] = await pool.query(query);
  return result
}

const add_device = async (payload)=>{
  try {
    const query = `insert into nodes (type,name,topic,id)
        values ('${payload.type}','${payload.name}','${payload.topic}','${payload.id}');` ;
    const [result] = await pool.query(query);
    return 1;
  } catch (error) {
    return 0;
  }
}
const get_devices = async () => {
  const query = `select * from nodes;`
  const [result] = await pool.query(query);
  return result
}

const get_topic_by_id = async (id) => {
  const query = `select topic from nodes where id = '${id}';`
  const [result] = await pool.query(query);
  return result
}

const update_device = async (payload) => {
  try {
    const query = `UPDATE nodes
                   SET type = '${payload.type}', name = '${payload.name}', topic = '${payload.topic}'
                   WHERE id = '${payload.id}';`;
    const [result] = await pool.query(query);
    if (result.affectedRows > 0) {
      return 1; // Update was successful
    } else {
      return 0; // No rows were updated, possibly because the ID doesn't exist
    }
  } catch (error) {
    return 0; // An error occurred during the update
  }
}

const delete_device = async (deviceId) => {
  try {
    const query = `DELETE FROM nodes WHERE id = '${deviceId}';`;
    const [result] = await pool.query(query);
    if (result.affectedRows > 0) {
      return 1; // Deletion was successful
    } else {
      return 0; // No rows were deleted, possibly because the ID doesn't exist
    }
  } catch (error) {
    return 0; // An error occurred during the deletion
  }
}

const log_single_data = async (data)=>{
  meassurement_data = data.value;
  timestamp_data = data.timestamp;
  variable_name = data.label;
  topic = data.topic;
  // console.log(meassurement_data,timestamp_data);
  const query = `INSERT INTO single_data_log (value, topic, variable_name,timestamp)
                  VALUES (${parseFloat(meassurement_data)},'${topic}','${variable_name}',${timestamp_data}); `;
  // console.log(query);
  const result = await pool.query(query);
  console.log('data logged');
  return 1
}


module.exports={
    get_acc:get_acc,
    get_nodes:get_nodes,
    node_data_len:node_data_len,
    user_validation:user_validation,
    user_register,user_register,
    log_data:log_data,
    get_data_bundle:read_data_bundle,
    get_devices:get_devices,
    add_device:add_device,
    update_device:update_device,
    delete_device:delete_device,
    get_topic_by_id:get_topic_by_id,
    log_single_data:log_single_data,
    pool:pool
}