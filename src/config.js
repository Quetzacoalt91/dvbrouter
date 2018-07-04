const config = {
  version: '1',
  server: {
    port: 3001,
    routes: { cors: true },
    labels: ['socket'],
  },
  mumudvb: {
    host: 'rapberrytv.local',
    path: '/home/thomas/mumudvb',
    channels: 2,
    filters: [
      'ADULT'
    ],
  },
};

export default config;
