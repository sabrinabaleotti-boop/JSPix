"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminForm } from "@/components/admin/form";
import { BankSelect } from "@/components/admin/bank-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { maskCep, maskCnpj, maskCpf, maskPhone } from "@/lib/masks";
import { MAX_PARTNERS, UFS } from "@/lib/recipient-input";
import { cn } from "@/lib/utils";
import { createRecipientAction } from "@/app/admin/actions";

type Mask = (v: string) => string;
const masked = (fn: Mask) => ({ onInput: (e: React.FormEvent<HTMLInputElement>) => (e.currentTarget.value = fn(e.currentTarget.value)) });

function Field({ label, name, hint, className, mask, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string; mask?: Mask }) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...(mask ? masked(mask) : {})} {...props} />
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

type ViaCep = { erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string };

function AddressFields({ prefix }: { prefix: string }) {
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "notfound" | "error">("idle");

  // Ao completar 8 dígitos, busca no ViaCEP e preenche rua, bairro, cidade e UF (o resto continua editável).
  async function lookup(input: HTMLInputElement) {
    const cep = input.value.replace(/\D/g, "");
    if (cep.length !== 8) return setCepStatus("idle");
    setCepStatus("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data: ViaCep = await res.json();
      if (!res.ok || data.erro) return setCepStatus("notfound");
      const form = input.form;
      const set = (field: string, value?: string) => {
        const el = form?.elements.namedItem(`${prefix}${field}`) as HTMLInputElement | HTMLSelectElement | null;
        if (el && value) el.value = value;
      };
      set("street", data.logradouro);
      set("neighborhood", data.bairro);
      set("city", data.localidade);
      set("state", data.uf);
      setCepStatus("idle");
      (form?.elements.namedItem(`${prefix}street_number`) as HTMLInputElement | null)?.focus();
    } catch {
      setCepStatus("error");
    }
  }

  return (
    <>
      <div>
        <Label htmlFor={`${prefix}zip_code`}>CEP</Label>
        <Input
          id={`${prefix}zip_code`}
          name={`${prefix}zip_code`}
          inputMode="numeric"
          placeholder="00000-000"
          required
          onInput={(e) => {
            e.currentTarget.value = maskCep(e.currentTarget.value);
            lookup(e.currentTarget);
          }}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {cepStatus === "loading" && "Buscando endereço..."}
          {cepStatus === "notfound" && "CEP não encontrado. Preencha o endereço manualmente."}
          {cepStatus === "error" && "Não foi possível consultar o CEP. Preencha manualmente."}
          {cepStatus === "idle" && "Preenche rua, bairro, cidade e UF automaticamente."}
        </p>
      </div>
      <div>
        <Label htmlFor={`${prefix}state`}>UF</Label>
        <Select id={`${prefix}state`} name={`${prefix}state`} required defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {UFS.map((uf) => (
            <option key={uf}>{uf}</option>
          ))}
        </Select>
      </div>
      <Field label="Rua" name={`${prefix}street`} required className="sm:col-span-2" />
      <Field label="Número" name={`${prefix}street_number`} required />
      <Field label="Complemento" name={`${prefix}complementary`} placeholder="Ex.: Apto 12" hint="Obrigatório na Pagar.me. Se não tiver, escreva Nenhum." required />
      <Field label="Bairro" name={`${prefix}neighborhood`} required />
      <Field label="Cidade" name={`${prefix}city`} required />
      <Field
        label="Ponto de referência"
        name={`${prefix}reference_point`}
        placeholder="Ex.: Próximo ao mercado"
        hint="Obrigatório na Pagar.me. Se não tiver, escreva Nenhum."
        required
        className="sm:col-span-2"
      />
    </>
  );
}

function PersonFields({ prefix, who }: { prefix: string; who: string }) {
  return (
    <>
      <Field label={`Nome completo ${who}`} name={`${prefix}name`} required className="sm:col-span-2" />
      <Field label="CPF" name={`${prefix}document`} mask={maskCpf} inputMode="numeric" placeholder="000.000.000-00" required />
      <Field label="E-mail" name={`${prefix}email`} type="email" required />
      <Field label="Telefone com DDD" name={`${prefix}phone`} mask={maskPhone} inputMode="numeric" placeholder="(11) 99999-9999" required />
      <Field label="Data de nascimento" name={`${prefix}birthdate`} type="date" required />
      <Field label="Profissão" name={`${prefix}professional_occupation`} placeholder="Ex.: Vendedor" required />
      <Field label="Renda mensal (R$)" name={`${prefix}monthly_income`} inputMode="decimal" placeholder="3.000,00" required />
      <Field label="Nome da mãe" name={`${prefix}mother_name`} hint="Opcional" className="sm:col-span-2" />
    </>
  );
}

export function RecipientForm() {
  const [type, setType] = useState<"individual" | "corporation">("individual");
  const [partners, setPartners] = useState(1);
  const [transfer, setTransfer] = useState(false);
  const [interval, setTransferInterval] = useState("Daily");
  const [anticipation, setAnticipation] = useState(false);
  const pj = type === "corporation";

  return (
    <AdminForm action={createRecipientAction} submitLabel="Cadastrar recebedor na Pagar.me" className="space-y-5">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="partner_count" value={partners} />

      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-card p-1">
        {(
          [
            ["individual", "Pessoa física (CPF)"],
            ["corporation", "Pessoa jurídica (CNPJ)"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setType(v)}
            className={cn("rounded-md px-3 py-2 text-sm font-medium transition-colors", type === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
          >
            {label}
          </button>
        ))}
      </div>

      {pj ? (
        <Section title="Dados da empresa">
          <Field label="Razão social" name="company_name" required className="sm:col-span-2" />
          <Field label="Nome fantasia" name="trading_name" required className="sm:col-span-2" />
          <Field label="CNPJ" name="document" mask={maskCnpj} inputMode="numeric" placeholder="00.000.000/0000-00" required />
          <Field label="Tipo de empresa" name="corporation_type" placeholder="Ex.: LTDA, MEI, EIRELI, SA" required />
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Telefone com DDD" name="phone" mask={maskPhone} inputMode="numeric" placeholder="(11) 3333-4444" required />
          <Field label="Data de fundação" name="founding_date" type="date" required />
          <Field label="Faturamento anual (R$)" name="annual_revenue" inputMode="decimal" placeholder="120.000,00" required />
          <Field label="Site" name="site_url" type="url" placeholder="https://..." hint="Opcional" className="sm:col-span-2" />
        </Section>
      ) : (
        <Section title="Dados do recebedor">
          <PersonFields prefix="" who="" />
          <Field label="Site" name="site_url" type="url" placeholder="https://..." hint="Opcional" className="sm:col-span-2" />
        </Section>
      )}

      <Section title={pj ? "Endereço da empresa" : "Endereço"}>
        <AddressFields prefix="addr_" />
      </Section>

      {pj &&
        Array.from({ length: partners }, (_, i) => (
          <Section key={i} title={`Sócio administrador ${i + 1}`} description="Representante legal da empresa, exigido pela Pagar.me para PJ.">
            <PersonFields prefix={`p${i}_`} who="" />
            <AddressFields prefix={`p${i}_addr_`} />
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name={`p${i}_legal_rep`} required className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]" />
              Declaro que esta pessoa é representante legal da empresa
            </label>
            {i === partners - 1 && partners > 1 && (
              <Button type="button" variant="ghost" className="w-fit text-destructive sm:col-span-2" onClick={() => setPartners(partners - 1)}>
                <Trash2 className="h-4 w-4" /> Remover sócio
              </Button>
            )}
          </Section>
        ))}
      {pj && partners < MAX_PARTNERS && (
        <Button type="button" variant="outline" onClick={() => setPartners(partners + 1)}>
          <Plus className="h-4 w-4" /> Adicionar sócio
        </Button>
      )}

      <Section title="Conta bancária" description="O titular precisa ser o próprio recebedor (mesmo CPF/CNPJ).">
        <Field label="Nome do titular" name="holder_name" required className="sm:col-span-2" />
        <div>
          <Label htmlFor="bank">Banco</Label>
          <BankSelect id="bank" name="bank" />
        </div>
        <div>
          <Label htmlFor="account_type">Tipo de conta</Label>
          <Select id="account_type" name="account_type" defaultValue="checking">
            <option value="checking">Corrente</option>
            <option value="savings">Poupança</option>
          </Select>
        </div>
        <Field label="Agência" name="branch_number" inputMode="numeric" required />
        <Field label="Dígito da agência" name="branch_check_digit" hint="Opcional" maxLength={2} />
        <Field label="Conta" name="account_number" inputMode="numeric" maxLength={13} required />
        <Field label="Dígito da conta" name="account_check_digit" maxLength={2} required />
      </Section>

      <Section title="Transferência automática" description="Quando ligada, a Pagar.me transfere o saldo disponível para a conta bancária na frequência escolhida.">
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="transfer_enabled" checked={transfer} onChange={(e) => setTransfer(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--primary))]" />
          Ativar transferência automática
        </label>
        {transfer && (
          <>
            <div>
              <Label htmlFor="transfer_interval">Frequência</Label>
              <Select id="transfer_interval" name="transfer_interval" value={interval} onChange={(e) => setTransferInterval(e.target.value)}>
                <option value="Daily">Diária</option>
                <option value="Weekly">Semanal</option>
                <option value="Monthly">Mensal</option>
              </Select>
            </div>
            {interval === "Weekly" && (
              <div>
                <Label htmlFor="transfer_day">Dia da semana</Label>
                <Select id="transfer_day" name="transfer_day" defaultValue="1">
                  {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((d, i) => (
                    <option key={d} value={i + 1}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {interval === "Monthly" && <Field label="Dia do mês" name="transfer_day" type="number" min={1} max={31} defaultValue={1} required />}
          </>
        )}
      </Section>

      <Section title="Antecipação automática" description="Opcional. Antecipa os recebíveis automaticamente, com custo definido no contrato com a Pagar.me.">
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="anticipation_enabled" checked={anticipation} onChange={(e) => setAnticipation(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--primary))]" />
          Ativar antecipação automática
        </label>
        {anticipation && (
          <>
            <div>
              <Label htmlFor="anticipation_type">Tipo</Label>
              <Select id="anticipation_type" name="anticipation_type" defaultValue="full">
                <option value="full">Full (todo o volume)</option>
                <option value="1025">1025 (dias 10 e 25)</option>
              </Select>
            </div>
            <Field label="Volume (%)" name="anticipation_volume" type="number" min={1} max={100} defaultValue={100} required />
            <Field label="Carência (dias)" name="anticipation_delay" type="number" min={0} hint="Opcional" />
          </>
        )}
      </Section>

      <Section title="Identificação interna">
        <Field label="Código" name="code" hint="Opcional. Referência única sua para este recebedor." className="sm:col-span-2" />
      </Section>
    </AdminForm>
  );
}
