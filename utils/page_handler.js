class Page_handler {
    constructor(app, express, path, view_path) {
        this.app = app;
        this.express = express;
        // aplikasi mengakses directory 'public' untuk local aset (foto,css,js)

        app.get('/realtime_graph/accelerometer', async (req, res) => {
            const static_view = view_path + 'fft_plot.html';
            res.sendFile(static_view);
        });

        app.get('/realtime_graph/single_data', async (req, res) => {
            const static_view = view_path + 'single_plot.html';
            res.sendFile(static_view);
        });

        app.get('/history_graph', async (req, res) => {
            const static_view = view_path + 'history_reader.html';
            res.sendFile(static_view);
        });

        app.get('/logger_data/direct', async (req, res) => {
            const static_view = view_path + 'logger_data.html';
            res.sendFile(static_view);
        });

        app.get('/', async (req, res) => {
            const static_view = view_path + 'login.html';
            res.sendFile(static_view);
        });

        app.get('/register', async (req, res) => {
            const static_view = view_path + 'register.html';
            res.sendFile(static_view);
        });
        app.get('/devices', async (req, res) => {
            const static_view = view_path + 'devices.html';
            const userData = req.cookies.login_info;
            if (userData) {
                res.sendFile(static_view);
            } else {
                console.log("belom login");
                res.redirect('/');
            }
        });
        app.get('/config', async (req, res) => {
            const static_view = view_path + 'setup.html';
            const userData = req.cookies.login_info;
            if (userData) {
                res.sendFile(static_view);
            } else {
                console.log("belom login");
                res.redirect('/');
            }
        });
    }
}
module.exports = Page_handler;