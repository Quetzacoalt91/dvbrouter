export default [
    {
        method: 'GET',
        path: '/',
        handler: (request, reply) => {
            reply('MumuDVB router is alive!');
        },
    },
    {
        method: 'GET',
        path: '/status',
        handler: (request, reply) => {
            reply(router.getStatus());
        },
    },
    {
        method: 'GET',
        path: '/playlist',
        handler: (request, reply) => {
            reply(router.buildPlaylist(request.connection.info.protocol, request.info.host))
            .header('Content-Type', 'audio/x-mpegurl')
            .header("Content-Disposition", 'attachment; filename=playlist.m3u');
        },
    },
    {
        method: 'GET',
        path: '/stream/{id}',
        handler: (request, reply) => {
            router.onConnect(request, (err, data) => {
            if (err) {
                console.error(err);
                return reply(err).code(500);
            }
            const url = `${request.connection.info.protocol}://${request.info.hostname}:${data.port}/bysid/${data.channel.service_id}`;
            return reply.redirect(url);
            });
        },
    },
];