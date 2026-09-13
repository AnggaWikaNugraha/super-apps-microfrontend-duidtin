import { Badge } from "../badge";
import { Table } from ".";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Table> = {
  title: "Components/Table",
  component: Table,
};

export default meta;

type Story = StoryObj<typeof Table>;

const transactions = [
  {
    id: "TRX001",
    tanggal: "2026-09-13",
    tujuan: "PT Sumber Makmur",
    jumlah: "Rp 2.500.000",
    status: "success" as const,
  },
  {
    id: "TRX002",
    tanggal: "2026-09-13",
    tujuan: "PT Cipta Karya",
    jumlah: "Rp 750.000",
    status: "warning" as const,
  },
  {
    id: "TRX003",
    tanggal: "2026-09-12",
    tujuan: "CV Maju Bersama",
    jumlah: "Rp 15.000.000",
    status: "danger" as const,
  },
];

const statusLabel: Record<string, string> = {
  success: "Berhasil",
  warning: "Diproses",
  danger: "Gagal",
};

export const Basic: Story = {
  name: "Tabel Transaksi (contoh dashboard)",
  render: () => (
    <Table aria-label="Riwayat transaksi" size="md">
      <Table.Header>
        <Table.Column isRowHeader>ID Transaksi</Table.Column>
        <Table.Column>Tanggal</Table.Column>
        <Table.Column>Tujuan</Table.Column>
        <Table.Column data-align="right">Nominal</Table.Column>
        <Table.Column>Status</Table.Column>
      </Table.Header>
      <Table.Body>
        {transactions.map((trx) => (
          <Table.Row key={trx.id}>
            <Table.Cell>{trx.id}</Table.Cell>
            <Table.Cell>{trx.tanggal}</Table.Cell>
            <Table.Cell>{trx.tujuan}</Table.Cell>
            <Table.Cell
              data-align="right"
              style={{ whiteSpace: "nowrap", fontWeight: 600 }}
            >
              {trx.jumlah}
            </Table.Cell>
            <Table.Cell>
              <Badge variant="soft" color={trx.status}>
                {statusLabel[trx.status]}
              </Badge>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
};

export const Compact: Story = {
  name: "Ukuran Compact (size sm)",
  render: () => (
    <Table aria-label="Riwayat transaksi compact" size="sm">
      <Table.Header>
        <Table.Column isRowHeader>ID</Table.Column>
        <Table.Column>Tujuan</Table.Column>
        <Table.Column data-align="right">Nominal</Table.Column>
      </Table.Header>
      <Table.Body>
        {transactions.map((trx) => (
          <Table.Row key={trx.id}>
            <Table.Cell>{trx.id}</Table.Cell>
            <Table.Cell>{trx.tujuan}</Table.Cell>
            <Table.Cell
              data-align="right"
              style={{ whiteSpace: "nowrap", fontWeight: 600 }}
            >
              {trx.jumlah}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
};
