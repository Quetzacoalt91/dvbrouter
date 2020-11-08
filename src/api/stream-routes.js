import router from '../router';

export default [
    {
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return 'MumuDVB router is alive!';
        },
    },
    {
        method: 'GET',
        path: '/status',
        handler: (request, h) => {
            return router.getStatus();
        },
    },
    {
        method: 'GET',
        path: '/playlist',
        handler: (request, h) => {
            return h.response(router.buildPlaylist(request.server.info.protocol, request.info.host))
                .type('audio/x-mpegurl')
                .header("Content-Disposition", 'attachment; filename=playlist.m3u');
        },
    },
    {
        method: 'GET',
        path: '/stream/{id}',
        handler: (request, h) => {
            // Asynchronous response
            return new Promise(resolve => {
                router.onConnect(request, (err, data) => {
                    if (err) {
                        console.error(err);
                        return resolve(h.response(err).code(500));
                    }
                    const url = `${request.server.info.protocol}://${request.info.hostname}:${data.port}/bysid/${data.channel.service_id}`;
                    resolve(h.redirect(url));
                });
            });
        },
    },
];
