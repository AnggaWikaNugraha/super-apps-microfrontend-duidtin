import { Button } from "../button";
import { Modal } from ".";

import type { Meta, StoryObj } from "@storybook/react";

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
        Transfer dana
      </Button>
      <Modal.Content>
        {({ close }) => (
          <>
            <Modal.Heading>Konfirmasi Transfer</Modal.Heading>
            <Modal.Body>
              Periksa detail transfer sebelum melanjutkan.
              <div
                style={{
                  padding: 20,
                  background: "var(--dtn-surface-muted)",
                  borderRadius: "var(--dtn-radius)",
                  marginTop: 20,
                }}
              >
                <div>PT Sumber Makmur · 0012 3456 7890</div>
                <strong className="dtn-story-amount">Rp 12.500.000</strong>
              </div>
            </Modal.Body>
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
            <Modal.Body>
              ID Transaksi: TRX001. Status: Berhasil. Tanggal: 8 Juli 2026.
            </Modal.Body>
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
