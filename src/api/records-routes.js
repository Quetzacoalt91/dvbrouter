import records from '../records';

export default [
    /**
     * Records
     */
    {
        method: 'GET',
        path: '/records',
        handler: (request, h) => {
            return records.list();
        },
    },
    {
        method: 'POST',
        path: '/records',
        handler: (request, h) => {
            return records.add(request.payload);
        },
    },
    {
        method: 'DELETE',
        path: '/records/{id}',
        handler: (request, h) => {
            return records.delete(request.params.id);
        },
    },
    {
        method: 'GET',
        path: '/records/check',
        handler: (request, h) => {
            records.checkAndStart();
            return records.list();
        },
    },
];
