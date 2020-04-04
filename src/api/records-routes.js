import records from '../records';

export default [
    /**
     * Records
     */
    {
        method: 'GET',
        path: '/records',
        handler: (request, reply) => {
            reply(records.list());
        },
    },
    {
        method: 'POST',
        path: '/records',
        handler: (request, reply) => {
            reply(records.add(request.payload));
        },
    },
    {
        method: 'DELETE',
        path: '/records/{id}',
        handler: (request, reply) => {
            reply(records.delete(request.params.id));
        },
    },
    {
        method: 'GET',
        path: '/records/check',
        handler: (request, reply) => {
            records.checkAndStart();
            reply(records.list());
        },
    },
];
