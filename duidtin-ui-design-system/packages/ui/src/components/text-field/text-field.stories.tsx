import { TextField } from ".";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof TextField> = {
  title: "Components/TextField",
  component: TextField,
};

export default meta;

type Story = StoryObj<typeof TextField>;

export const Basic: Story = {
  name: "Email (contoh form login)",
  render: () => (
    <TextField name="email" type="email" isRequired>
      <TextField.Label>Email</TextField.Label>
      <TextField.Input placeholder="nama@perusahaan.co.id" />
    </TextField>
  ),
};

export const DenganDeskripsi: Story = {
  name: "Dengan deskripsi",
  render: () => (
    <TextField name="npwp">
      <TextField.Label>NPWP</TextField.Label>
      <TextField.Input placeholder="00.000.000.0-000.000" />
      <TextField.Description>Tanpa tanda baca pun diterima.</TextField.Description>
    </TextField>
  ),
};

export const Password: Story = {
  render: () => (
    <TextField name="password" type="password" isRequired>
      <TextField.Label>Password</TextField.Label>
      <TextField.Input placeholder="••••••••" />
    </TextField>
  ),
};

export const Invalid: Story = {
  name: "Pesan galat dari server",
  render: () => (
    <TextField name="email" type="email" isInvalid defaultValue="angga@duidtin">
      <TextField.Label>Email</TextField.Label>
      <TextField.Input />
      <TextField.Error>Email atau password salah.</TextField.Error>
    </TextField>
  ),
};

export const Disabled: Story = {
  render: () => (
    <TextField name="perusahaan" isDisabled defaultValue="PT Duitin Nusantara">
      <TextField.Label>Perusahaan</TextField.Label>
      <TextField.Input />
    </TextField>
  ),
};
