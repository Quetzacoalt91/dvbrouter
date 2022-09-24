export type DvbConfig = {
  host: string;
  path: string;
  channels: number;
  filters: string[];
};

export type StorageConfig = {
  destPath: string;
};