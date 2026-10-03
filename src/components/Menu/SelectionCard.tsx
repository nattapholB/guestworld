export function SelectionCard({ title, description, onClick, index }: {
  title: string; description: string; onClick: () => void; index?: string
}) {
  return <button className="mode-card" onClick={onClick}>
    {index && <span className="card-index" aria-hidden="true">{index}</span>}
    <span className="mode-card-title">{title}</span>
    <span className="mode-card-description">{description}</span>
  </button>
}
