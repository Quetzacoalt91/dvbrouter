import Hapi from '@hapi/hapi';
import Router from '../router';

export default (router: Router) => [
    {
        method: 'GET',
        path: '/',
        handler: (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
            return 'MumuDVB router is alive!';
        },
    },
    {
        method: 'GET',
        path: '/status',
        handler: (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
            return router.getStatus();
        },
    },
    {
        method: 'GET',
        path: '/playlist',
        handler: (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
            return h.response(router.buildPlaylist(request.server.info.protocol, request.info.host))
                .type('audio/x-mpegurl')
                .header("Content-Disposition", 'attachment; filename=playlist.m3u');
        },
    },
    {
        method: 'GET',
        path: '/stream/{id}',
        handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
            try {
                const channel = await router.onConnect(+(request.params.id));
                const url = `${request.server.info.protocol}://${request.info.hostname}:${channel.port}/bysid/${channel.service_id}`;
                return h.redirect(url);
            } catch (err) {
                console.error(err);
                return h.response(err).code(500);
            }
        },
    },
];
