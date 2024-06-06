
const LZUTF8 = require('lzutf8');

class Logger_model {
  constructor(pool) {
    this.pool = pool;
  }
  log_single_data = async (table_name, payload) => {
    const meassurement_data = JSON.stringify(payload.meassurement_data.values);
    const timestamp_data = JSON.stringify(payload.meassurement_data.timestamp);

    let compressed_measurement_data = String(LZUTF8.compress(meassurement_data, { outputEncoding: 'Base64' }));

    // console.log(meassurement_data);
    // console.log(timestamp_data);
    const query = `INSERT INTO ${table_name} (unix_timestamp, json, node, time_data)
                         VALUES (${parseInt(timestamp_data)},'${compressed_measurement_data}','${payload.node}','${timestamp_data}'); `;
    // console.log(payload);
    const result = await this.pool.query(query);
    console.log('data logged');
    return 1;
  }

  get_nodes = async () => {
    // try {
    //   const [result] = await this.pool.query("SELECT DISTINCT node_name FROM acc_data_log");
    //   return result;
    // } catch (error) {
    //   const [result] = await this.pool.query("SELECT DISTINCT node FROM data_log");
    //   return result;
    // }
    const [result] = await this.pool.query("SELECT DISTINCT node FROM data_log");
    return result;
  }

  get_node_datalog = async (id) => {
    const query = `
    select * from ${id};
    `;
    const [result] = await this.pool.query(query);
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

  log_acc_array_data = async (table_name, payload) => {
    const meassurement_data = JSON.stringify(payload.meassurement_data);
    const timestamp_data = JSON.stringify(payload.time_data);
    let compressed_measurement_data = String(LZUTF8.compress(meassurement_data, { outputEncoding: 'Base64' }));
    let compressed_timestamp_data = String(LZUTF8.compress(timestamp_data, { outputEncoding: 'Base64' }));
    const query = `INSERT INTO ${table_name} (unix_timestamp, json, node, time_data)
                         VALUES (${parseInt(payload.timestamp)},'${compressed_measurement_data}','${payload.node}','${compressed_timestamp_data}'); `;
    const result = await this.pool.query(query);
    console.log('data logged');
    return 1;
  }

  get_data_bundle = async (node, unix, limit, offset) => {
    const query = `select * from data_log where node='${node}' and unix_timestamp>=${unix} limit ${limit} offset ${offset};`
    // console.log(query)
    const [result] = await this.pool.query(query);
    // console.log(result)
    return result;
  }
}
module.exports = Logger_model;