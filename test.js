t1 = (new Date().getTime() / 1000)
const  sqlite = require('./model/sqlitedb');

const dummy = {
    data: new Array(128).fill(5000) // Creates an array with 128 null values
};

const make1000 = async ()=>{
    t0 = (new Date().getTime() / 1000)
    for(let i=0;i<100;i++){
        const insertedId1 = sqlite.log_acc_data('timestamp_1', `'${dummy.data}'`, 'node_1', `'${dummy.data}'`);
        // console.log('Data inserted with IDs:', insertedId1)
    }
    console.log((new Date().getTime() / 1000)-t0)
}

const make = async()=>{
    make1000()
    make1000()
}


// make().then(()=>{
//     console.log("finish")
//     console.log((new Date().getTime() / 1000)-t1)
// })

// sqlite.cleartable()