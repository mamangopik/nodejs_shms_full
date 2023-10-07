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

  async user_validation(email, password) {
    const query = `SELECT * FROM akun WHERE email = '${email}' AND password = '${password}'`;
    console.log(query);
    const [result] = await this.pool.query(query);
    console.log(result);
    return result.length >= 1;
  }

  async get_nodes() {
    const [result] = await this.pool.query("SELECT DISTINCT node_name FROM acc_data_log");
    return result;
  }

  async user_register(email, password) {
    const query = `INSERT INTO akun (email, password, status)
    VALUES ('${email}', '${password}', 1);`;
    const [result] = await this.pool.query(query);
    console.log(result);
  }

  async get_acc(query) {
    const [result] = await this.pool.query(query);
    return result;
  }

  async node_data_len(node) {
    const query = "SELECT count(*) FROM `acc_data_log` WHERE node_name = '" + node + "';";
    const result = await this.pool.query(query);
    return result[0][0]['count(*)'];
  }

  async log_data(payload) {
    const meassurement_data = JSON.stringify(payload.meassurement_data);
    const timestamp_data = JSON.stringify(payload.time_data);
    const query = `INSERT INTO data_log (unix_timestamp, json, node, time_data)
                     VALUES (${parseInt(payload.timestamp)},'${meassurement_data}','${payload.node}','${timestamp_data}'); `;
    console.log(payload);
    const result = await this.pool.query(query);
    console.log('data logged');
    return 1;
  }

  async read_data_bundle(node, unix, limit, offset) {
    const query = `select * from data_log where node='${node}' and unix_timestamp>=${unix} limit ${limit} offset ${offset};`
    const [result] = await this.pool.query(query);
    return result;
  }

  async add_device(payload) {
    try {
      const query = `insert into nodes (type,name,topic,id)
          values ('${payload.type}','${payload.name}','${payload.topic}','${payload.id}');`;
      const [result] = await this.pool.query(query);
      return 1;
    } catch (error) {
      return 0;
    }
  }

  async get_devices() {
    const query = `select * from nodes;`
    const [result] = await this.pool.query(query);
    return result;
  }

  async get_topic_by_id(id) {
    const query = `select topic from nodes where id = '${id}';`
    const [result] = await this.pool.query(query);
    return result;
  }

  async update_device(payload) {
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

  async delete_device(device_id) {
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

  async log_single_data(data) {
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
