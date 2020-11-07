# dvbrouter

Proxy and manager of mumudvb instances

## Introduction

Forwarding DVB signal to a network can be done thanks to tools like [Mumudvb](https://mumudvb.net/). Following their documentation, one instance of allows to retrieve all the channels of one [multiplex](https://en.wikipedia.org/wiki/Multiplex_(television)).

To broadcast additional channels that are on another multiplex, tutorials recommends to use a dual channel DVB receiver and start another process of the same software.

To avoid having to choose between multiplexes, this project has been created: - It creates a playlist of channels on startup from a group of configuration files,
- It starts automatically mumudvb instances once a client opens a request to one the channel present in the playlist,
- It forwards the client to the stream once ready,
- It closes the process when no more clients watch an existing multiplex.

## Installation for production

```
npm run build
npm run serve
```

The user running this project will be the owner of the mumudvb processes. It must run with a user that belongs to the `video` group or `root`.

## Development

```
npm run start
```

Any change in the project will restart `dvbrouter`.
