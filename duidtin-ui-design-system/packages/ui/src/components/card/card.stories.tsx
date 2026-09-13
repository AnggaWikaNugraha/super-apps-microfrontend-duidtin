import { Button } from "../button";
import { Badge } from "../badge";
import { Card } from ".";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Card> = { title: "Components/Card", component: Card };
export default meta;
type Story = StoryObj<typeof Card>;

export const Elevated: Story = {
  args: { variant: "elevated", size: "md" },
  render: (args) => (
    <Card {...args} style={{ maxWidth: 480 }}>
      <Card.Header>Konfirmasi transfer</Card.Header>
      <Card.Body>
        Transfer ke PT Sumber Makmur · 0012 3456 7890
        <div className="dtn-story-amount" style={{ marginTop: 16 }}>
          Rp 12.500.000
        </div>
      </Card.Body>
      <Card.Footer>
        <Button variant="outline" color="default">
          Batal
        </Button>
        <Button>Konfirmasi</Button>
      </Card.Footer>
    </Card>
  ),
};
export const Outlined: Story = {
  args: { variant: "outlined", size: "md" },
  render: (args) => (
    <Card {...args} style={{ maxWidth: 480 }}>
      <Card.Header>Rekening operasional</Card.Header>
      <Card.Body>
        Giro operasional · 7890
        <div style={{ marginTop: 16 }}>
          <Badge color="success" variant="soft">
            Aktif
          </Badge>
        </div>
      </Card.Body>
    </Card>
  ),
};
export const Soft: Story = {
  args: { variant: "soft", size: "sm" },
  render: (args) => (
    <Card {...args} style={{ maxWidth: 480 }}>
      <Card.Header>Menunggu persetujuan</Card.Header>
      <Card.Body>
        <div className="dtn-story-amount">12 transaksi</div>
        <div style={{ marginTop: 16 }}>
          <Badge color="warning" variant="soft">
            Perlu ditinjau
          </Badge>
        </div>
      </Card.Body>
    </Card>
  ),
};
export const StatCard: Story = {
  name: "Ringkasan rekening",
  args: { variant: "elevated", size: "md" },
  render: (args) => (
    <div className="dtn-story-grid">
      {["Saldo tersedia", "Pemasukan bulan ini"].map((title, i) => (
        <Card {...args} key={title}>
          <Card.Header>{title}</Card.Header>
          <Card.Body>
            <div className="dtn-story-amount">
              {i ? "Rp 82.000.000" : "Rp 248.500.000"}
            </div>
            <div style={{ marginTop: 16 }}>
              <Badge color="success" variant="soft">
                +12,8% bulan ini
              </Badge>
            </div>
          </Card.Body>
        </Card>
      ))}
    </div>
  ),
};
export const AllVariants: Story = {
  name: "Semua varian",
  render: () => (
    <div className="dtn-story-grid">
      {(["outlined", "elevated", "soft"] as const).map((variant, i) => (
        <Card key={variant} variant={variant}>
          <Card.Header>
            {
              ["Saldo tersedia", "Pemasukan bulan ini", "Menunggu persetujuan"][
                i
              ]
            }
          </Card.Header>
          <Card.Body>
            <div className="dtn-story-amount">
              {["Rp 248.500.000", "Rp 82.000.000", "12 transaksi"][i]}
            </div>
            <div style={{ marginTop: 16 }}>
              <Badge color={i === 2 ? "warning" : "success"} variant="soft">
                {i === 2 ? "Perlu ditinjau" : "+12,8% bulan ini"}
              </Badge>
            </div>
          </Card.Body>
        </Card>
      ))}
    </div>
  ),
};
