import {Request, ResponseToolkit} from '@hapi/hapi';
import EitFormatter from '../eit-formatter';
import Router from '../router';

export default (router: Router, eitFormatter: EitFormatter) => [
    {
        method: 'GET',
        path: '/',
        handler: (request: Request, h: ResponseToolkit) => {
            return 'MumuDVB router is alive!';
        },
    },
    {
        method: 'GET',
        path: '/status',
        handler: (request: Request, h: ResponseToolkit) => {
            return router.getStatus();
        },
    },
    {
        method: 'GET',
        path: '/playlist',
        handler: (request: Request, h: ResponseToolkit) => {
            return h.response(router.buildPlaylist(request.server.info.protocol, request.info.host))
                .type('audio/x-mpegurl')
                .header("Content-Disposition", 'attachment; filename=playlist.m3u');
        },
    },
    {
        method: 'GET',
        path: '/eit.xml',
        handler: (request: Request, h: ResponseToolkit) => {
            return h.response(eitFormatter.toXml())
                .type('application/xml')
                .header("Content-Disposition", 'attachment; filename=eit.xml');
        },
    },
    {
        method: 'GET',
        path: '/stream/{id}',
        handler: async (request: Request, h: ResponseToolkit) => {
            try {
                const channel = await router.onConnect(+(request.params.id));
                const url = `${request.server.info.protocol}://${request.info.hostname}:${channel.port}/bysid/${channel.service_id}`;
                return h.redirect(url);
            } catch (err: any) {
                console.error(err);
                return h.response('Server error').code(500);
            }
        },
    },
];
