import { Button } from "../button";
import { Modal } from ".";

import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof Modal> = {
  title: "Components/Modal",
  component: Modal,
};

export default meta;

type Story = StoryObj<typeof Modal>;

export const ConfirmDialog: Story = {
  name: "Konfirmasi Transfer (contoh dashboard)",
  render: () => (
    <Modal.Root>
      <Button variant="solid" color="primary">
        Buka Modal
      </Button>
      <Modal.Content>
        {({ close }) => (
          <>
            <Modal.Heading>Konfirmasi Transfer</Modal.Heading>
            <Modal.Body>Anda akan mentransfer Rp 2.500.000 ke rekening 1234567890 a.n. Budi Santoso. Lanjutkan?</Modal.Body>
            <Modal.Footer>
              <Button variant="outline" color="default" onPress={close}>
                Batal
              </Button>
              <Button variant="solid" color="primary" onPress={close}>
                Konfirmasi
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal.Content>
    </Modal.Root>
  ),
};

export const DefaultOpen: Story = {
  name: "Default Terbuka (buat preview cepat)",
  render: () => (
    <Modal.Root defaultOpen>
      <Button>Trigger (tersembunyi di belakang modal)</Button>
      <Modal.Content>
        {({ close }) => (
          <>
            <Modal.Heading>Detail Transaksi</Modal.Heading>
            <Modal.Body>ID Transaksi: TRX001. Status: Berhasil. Tanggal: 8 Juli 2026.</Modal.Body>
            <Modal.Footer>
              <Button variant="solid" color="primary" onPress={close}>
                Tutup
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal.Content>
    </Modal.Root>
  ),
};
