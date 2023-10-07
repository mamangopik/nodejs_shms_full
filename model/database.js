const mysql = require('mysql2');

class Database {
  constructor(host, user, pwd, db) {
    this.pool = mysql.createPool({
      host: host,
      user: user,
      password: pwd,
      database: db
    }).promise();
  }

  
  user_is_exist = async (email)=>{
    const query = `SELECT email FROM akun WHERE email = '${email}'`;
    const [result] = await this.pool.query(query);
    console.log(result.length >= 1);
    return (result.length >= 1);
  }

  user_validation = async (email, password) => {
    const query = `SELECT * FROM akun WHERE email = '${email}' AND password = '${password}'`;
    console.log(query);
    const [result] = await this.pool.query(query);
    if(result.length >= 1){
      const payload = {
        status:true,
        uid:result[0].hash
      }
      console.log(payload);
      return payload;
    }else{
      const payload = {
        status:false,
        uid:''
      }
      console.log(payload);
      return payload;
    }
  }

  user_register = async (email, password,hash) => {
    const already_exist = await this.user_is_exist(email,hash);
    if(already_exist){
      return false;
    }else{
      const query = `INSERT INTO akun (email, password, hash)
      VALUES ('${email}', '${password}','${hash}');`;
      const [result] = await this.pool.query(query);
      console.log(result);
      return true;
    }
  }

  get_nodes = async () => {
    const [result] = await this.pool.query("SELECT DISTINCT node_name FROM acc_data_log");
    return result;
  }

  get_acc = async (query) => {
    const [result] = await this.pool.query(query);
    return result;
  }

  node_data_len = async (node) => {
    const query = "SELECT count(*) FROM `acc_data_log` WHERE node_name = '" + node + "';";
    const result = await this.pool.query(query);
    return result[0][0]['count(*)'];
  }

  log_data = async (payload) => {
    const meassurement_data = JSON.stringify(payload.meassurement_data);
    const timestamp_data = JSON.stringify(payload.time_data);
    const query = `INSERT INTO data_log (unix_timestamp, json, node, time_data)
                     VALUES (${parseInt(payload.timestamp)},'${meassurement_data}','${payload.node}','${timestamp_data}'); `;
    console.log(payload);
    const result = await this.pool.query(query);
    console.log('data logged');
    return 1;
  }

  read_data_bundle = async (node, unix, limit, offset) => {
    const query = `select * from data_log where node='${node}' and unix_timestamp>=${unix} limit ${limit} offset ${offset};`
    const [result] = await this.pool.query(query);
    return result;
  }

  add_device = async (payload) => {
    try {
      const query = `insert into nodes (type,name,topic,id)
          values ('${payload.type}','${payload.name}','${payload.topic}','${payload.id}');`;
      const [result] = await this.pool.query(query);
      return 1;
    } catch (error) {
      return 0;
    }
  }

  get_devices = async () => {
    const query = `select * from nodes;`
    const [result] = await this.pool.query(query);
    return result;
  }

  get_topic_by_id = async (id) => {
    const query = `select topic from nodes where id = '${id}';`
    const [result] = await this.pool.query(query);
    return result;
  }

  update_device = async (payload) => {
    try {
      const query = `UPDATE nodes
                     SET type = '${payload.type}', name = '${payload.name}', topic = '${payload.topic}'
                     WHERE id = '${payload.id}';`;
      const [result] = await this.pool.query(query);
      if (result.affectedRows > 0) {
        return 1; // Update was successful
      } else {
        return 0; // No rows were updated, possibly because the ID doesn't exist
      }
    } catch (error) {
      return 0; // An error occurred during the update
    }
  }

  delete_device = async (device_id) => {
    try {
      const query = `DELETE FROM nodes WHERE id = '${device_id}';`;
      const [result] = await this.pool.query(query);
      if (result.affectedRows > 0) {
        return 1; // Deletion was successful
      } else {
        return 0; // No rows were deleted, possibly because the ID doesn't exist
      }
    } catch (error) {
      return 0; // An error occurred during the deletion
    }
  }

  log_single_data = async (data) => {
    const meassurement_data = data.value;
    const timestamp_data = data.timestamp;
    const variable_name = data.label;
    const topic = data.topic;
    const query = `INSERT INTO single_data_log (value, topic, variable_name,timestamp)
                    VALUES (${parseFloat(meassurement_data)},'${topic}','${variable_name}',${timestamp_data}); `;
    const result = await this.pool.query(query);
    console.log('data logged');
    return 1;
  }
}

module.exports = Database;
