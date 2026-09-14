import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, Field, GoogleMark, IconMail, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { mailAccountsApi } from '@/lib/api/mailAccounts.api';
import { queryKeys } from '@/lib/api/queryKeys';

export function EmailSettingsTab() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusKey = queryKeys.mailAccountStatus(organization?.id ?? '', user?.id ?? '');
  const { data: status } = useQuery({
    queryKey: statusKey,
    queryFn: mailAccountsApi.getStatus,
    enabled: !!organization && !!user,
  });

  // The Gmail OAuth callback redirects the browser back here with these params —
  // there's no in-app navigation involved, so this is how we learn the result.
  const gmailResult = searchParams.get('gmail');
  useEffect(() => {
    if (!gmailResult) return;
    queryClient.invalidateQueries({ queryKey: statusKey });
    const next = new URLSearchParams(searchParams);
    next.delete('gmail');
    next.delete('reason');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gmailResult]);

  const connectMutation = useMutation({
    mutationFn: mailAccountsApi.getGmailConnectUrl,
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: mailAccountsApi.disconnectGmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: statusKey }),
  });

  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!status || hydrated) return;
    setName(status.signatureName ?? user?.name ?? '');
    setDesignation(status.signatureDesignation ?? '');
    setCompany(status.signatureCompany ?? organization?.name ?? '');
    setPhone(status.signaturePhone ?? '');
    setWebsite(status.signatureWebsite ?? '');
    setHydrated(true);
  }, [status, hydrated, user, organization]);

  const signatureMutation = useMutation({
    mutationFn: () =>
      mailAccountsApi.updateSignature({
        signatureName: name,
        signatureDesignation: designation,
        signatureCompany: company,
        signaturePhone: phone,
        signatureWebsite: website,
      }),
    onSuccess: (data) => queryClient.setQueryData(statusKey, data),
  });

  const roleLine = [designation, company].filter(Boolean).join(', ');
  const contactLine = [phone, website].filter(Boolean).join(' · ');

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="font-bold text-ink-900 text-lg">Gmail integration</h2>
        <p className="text-[13px] text-ink-500 mt-0.5 mb-4">
          Connect Gmail to send interview invitations and candidate emails directly from your
          own address.
        </p>

        {gmailResult === 'error' && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-[13px] text-rose-700">
            Couldn't connect Gmail: {searchParams.get('reason') ?? 'unknown error'}
          </div>
        )}
        {gmailResult === 'connected' && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-[13px] text-emerald-700">
            Gmail connected successfully.
          </div>
        )}

        {!status?.googleConfigured ? (
          <div className="rounded-2xl border border-dashed border-ink-200 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-ink-100 grid place-items-center mx-auto mb-3 text-ink-400">
              <IconMail className="w-6 h-6" />
            </div>
            <p className="font-semibold text-ink-800 text-[14px]">Gmail isn't set up on this server yet</p>
            <p className="text-[13px] text-ink-500 mt-1 max-w-sm mx-auto">
              An admin needs to add a Google OAuth Client ID/Secret (GOOGLE_CLIENT_ID /
              GOOGLE_CLIENT_SECRET) to the backend's environment before recruiters can connect
              their Gmail account.
            </p>
          </div>
        ) : status.gmailConnected ? (
          <div className="flex items-center justify-between rounded-2xl border border-ink-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 grid place-items-center">
                <GoogleMark className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-ink-900 text-[14px]">Connected as {status.gmailEmail}</p>
                <p className="text-[12px] text-ink-500">
                  Candidate emails you send now go out from this address.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={disconnectMutation.isPending}
              onClick={() => disconnectMutation.mutate()}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-ink-200 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm ring-1 ring-ink-100 grid place-items-center mx-auto mb-3">
              <GoogleMark className="w-6 h-6" />
            </div>
            <p className="font-bold text-ink-900 text-[15px]">Connect your Gmail account</p>
            <p className="text-[13px] text-ink-500 mt-1 mb-4 max-w-sm mx-auto">
              Send interview invitations and candidate emails from your own address, with
              tracking.
            </p>
            <Button
              variant="ai"
              loading={connectMutation.isPending}
              onClick={() => connectMutation.mutate()}
              className="mx-auto"
            >
              <GoogleMark className="w-4 h-4" />
              Connect Gmail
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-bold text-ink-900 text-lg">Email signature</h2>
        <p className="text-[13px] text-ink-500 mt-0.5 mb-4">Appended to outgoing candidate emails.</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Designation">
                <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company">
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
            <Field label="Website">
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
            </Field>
          </div>

          <div>
            <p className="text-[13px] font-medium text-ink-700 mb-1.5">Preview</p>
            <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-4 text-[13px] text-ink-700 leading-relaxed">
              <p className="text-ink-500">Best regards,</p>
              {name && <p className="font-bold text-ink-900">{name}</p>}
              {roleLine && <p>{roleLine}</p>}
              {contactLine && <p className="text-ink-500">{contactLine}</p>}
              {!name && !roleLine && !contactLine && (
                <p className="text-ink-400 italic">Fill in the fields to see a preview.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button loading={signatureMutation.isPending} onClick={() => signatureMutation.mutate()}>
            Save signature
          </Button>
        </div>
      </Card>
    </div>
  );
}
