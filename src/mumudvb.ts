import { ChannelsList } from "./types/mumudvb";

export const getChannelsList = async (port: number): Promise<ChannelsList> => {
    // Harcoded 127.0.0.1 because we run the MumuDVB processes on the same machine
    const channelUrl = `http://127.0.0.1:${port}/channels_list.json`;
    const response = await fetch(channelUrl);
    const data: ChannelsList = await response.json();
    return data;
}