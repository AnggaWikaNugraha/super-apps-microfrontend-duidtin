import { Alert } from ".";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Alert> = {
  title: "Components/Alert",
  component: Alert,
};

export default meta;

type Story = StoryObj<typeof Alert>;

export const Warning: Story = {
  name: "Peringatan (contoh dashboard)",
  render: () => (
    <Alert variant="warning" style={{ maxWidth: 600 }}>
      <Alert.Icon aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6m0 3v1" />
        </svg>
      </Alert.Icon>
      <Alert.Content>
        <Alert.Title>Saldo hampir habis</Alert.Title>
        <Alert.Description>
          Saldo akun Anda tersisa Rp 150.000. Segera lakukan top up untuk
          menghindari transaksi tertunda.
        </Alert.Description>
      </Alert.Content>
    </Alert>
  ),
};

export const Success: Story = {
  render: () => (
    <Alert variant="success" style={{ maxWidth: 600 }}>
      <Alert.Icon aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6m0 3v1" />
        </svg>
      </Alert.Icon>
      <Alert.Content>
        <Alert.Title>Transfer berhasil</Alert.Title>
        <Alert.Description>
          Rp 2.500.000 telah berhasil dikirim ke Budi Santoso.
        </Alert.Description>
      </Alert.Content>
    </Alert>
  ),
};

export const Danger: Story = {
  render: () => (
    <Alert variant="danger" style={{ maxWidth: 600 }}>
      <Alert.Icon aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6m0 3v1" />
        </svg>
      </Alert.Icon>
      <Alert.Content>
        <Alert.Title>Transaksi gagal</Alert.Title>
        <Alert.Description>
          Saldo tidak mencukupi untuk menyelesaikan transaksi ini.
        </Alert.Description>
      </Alert.Content>
    </Alert>
  ),
};

export const AllVariants: Story = {
  name: "Semua Varian (perbandingan)",
  render: () => (
    <div className="dtn-story-grid">
      {(
        ["default", "primary", "success", "warning", "danger", "info"] as const
      ).map((variant) => (
        <Alert key={variant} variant={variant}>
          <Alert.Icon aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v6m0 3v1" />
            </svg>
          </Alert.Icon>
          <Alert.Content>
            <Alert.Title>{variant}</Alert.Title>
            <Alert.Description>
              Contoh pesan untuk varian {variant}.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ))}
    </div>
  ),
};
