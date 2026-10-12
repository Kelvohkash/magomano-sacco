import { BulkImportPanel } from '../../BulkImportPanel'

interface AdminBulkImportViewProps {
  onImported: () => Promise<void>
}

export function AdminBulkImportView({ onImported }: AdminBulkImportViewProps) {
  return (
    <div className="admin-view-panel">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">Monthly Statement CSV Import</h1>
          <p className="view-page-desc">
            Batch upload monthly member savings statements and loan repayment files with atomic server validation.
          </p>
        </div>
      </div>
      <BulkImportPanel onImported={onImported} />
    </div>
  )
}

