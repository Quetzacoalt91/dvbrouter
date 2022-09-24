export type Client = {
  client_number?: number;
  socket?: number;
  remote_address?: string;
  remote_port?: number;
  buffer_size?: number;
  consecutive_errors?: number;
  first_error_time?: number;
  last_error_time?: number;
}

export type NonConnectedClient = {};

export type Pid = {
  number: number;
  type: string;
  language: string;
};

export type Channel = {
number: number,
lcn: number,
name: string,
sap_group: string,
ip_multicast: string,
port_multicast: number,
num_clients: number,
ratio_scrambled: number,
is_up: number,
pcr_pid: number,
pmt_version: number,
unicast_port: number,
service_id: number,
service_type: any,
pids_num: number,
pids: Pid[],
clients: (Client|NonConnectedClient)[],
};

export type ChannelsList = Channel[];
