import { RemotePanel } from '@/features/remote/RemotePanel'

export default function RemotePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="nself-gradient-text text-xl font-semibold">
          Remote Mode
        </h1>
        <p className="text-nself-text-muted text-xs">
          Connect to an nCloud server via SSH or API and drive its stack from
          here.
        </p>
      </div>
      <RemotePanel />
    </div>
  )
}
