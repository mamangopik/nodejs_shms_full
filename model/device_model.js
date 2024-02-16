class Device_model {
  constructor(pool, prop) {
    this.pool = pool;
    this.prop = prop;
  }
  add_device = async (payload) => {
    try {
      const query = `insert into nodes (type,name,topic,id,log_raw)
              values ('${payload.type}','${payload.name}','${payload.topic}','${payload.id}',0);`;
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
      console.log({ "payload": payload })
      const query = `UPDATE nodes
                         SET type = '${payload.type}', name = '${payload.name}', topic = '${payload.topic}' ,log_raw = '${payload.log_raw}'
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

  device_has_table = async (id) => {
    const query = `
    SELECT COUNT(*) as table_count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = '${this.prop.database}' AND TABLE_NAME = '${id}';
    `;
    console.log(query);
    const [result] = await this.pool.query(query);
    let table_count = result[0].table_count;
    if (table_count > 0) {
      return 1;
    } else {
      return 0;
    }
  }

  create_device_table = async (table_based_from_id) => {
    const query = `CREATE TABLE if not exists ${table_based_from_id} (
      unix_timestamp BIGINT,
      id INT AUTO_INCREMENT PRIMARY KEY,
      json TEXT,
      node TEXT,
      time_data TEXT
  );`;
    const [result] = await this.pool.query(query);
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
}
module.exports = Device_model;