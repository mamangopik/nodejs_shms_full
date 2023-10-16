const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/media/orangepi/SHMS_LOG/acc_log2.db');
// Create a table
const log_acc_data = async (payload) => {
    const meassurement_data = JSON.stringify(payload.meassurement_data);
    const timestamp_data = JSON.stringify(payload.time_data);
    return new Promise((resolve, reject) => {
      const stmt = db.prepare('INSERT INTO acc_log (unix_timestamp, json, node, time_data) VALUES (?, ?, ?, ?)');
      stmt.run(parseInt(payload.timestamp), meassurement_data, payload.node, timestamp_data, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID); // Return the ID of the inserted row
        }
  
        stmt.finalize();
      });
    });
  };

function clearAccLogTable() {
  db.serialize(() => {
    // Execute a DELETE statement to remove all rows from the "acc_log" table
    db.run('DELETE FROM acc_log', function(err) {
      if (err) {
        console.error('Error clearing "acc_log" table:', err.message);
      } else {
        console.log('Cleared "acc_log" table.');
      }
    });
  });

  // Close the database
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database closed.');
    }
  });
}

  
module.exports={
    log_acc_data:log_acc_data,
    cleartable:clearAccLogTable
}