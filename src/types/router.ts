import { Instance } from '../process-manager';
import { Channel as MumuDVBChannel } from './mumudvb';

export type InitData = {
    port: number;
    configFile: string;
};

export type Channel = MumuDVBChannel & Instance;
