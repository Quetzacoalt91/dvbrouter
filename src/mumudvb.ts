import { ChannelsList } from "./types/mumudvb";

export const getChannelsList = async (port: number): Promise<ChannelsList> => {
    // Harcoded 127.0.0.1 because we run the MumuDVB processes on the same machine
    const channelUrl = `http://127.0.0.1:${port}/channels_list.json`;
    const response = await fetch(channelUrl);
    return response.json();
}

export const filterChannelsWithClients = (list: ChannelsList): ChannelsList => {
    return list.filter(function(channel) {
    // We check the client at row 0, which always exist.
    // If nobody is connected, its value is an empty object and thus must be filtered
    return !(Object.keys(channel.clients[0]).length === 0
        && channel.clients[0].constructor === Object);
    });
};
