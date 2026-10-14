import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'

export interface RowActionItem {
  id: string
  label: string
  sublabel?: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'orange'
}

interface RowActionDropdownProps {
  label?: string
  items: RowActionItem[]
  align?: 'right' | 'left'
  direction?: 'down' | 'up'
}

export function RowActionDropdown({
  label,
  items,
  align = 'right',
  direction = 'down',
}: RowActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="row-action-dropdown-wrap" ref={dropdownRef}>
      <button
        type="button"
        className={`row-action-trigger-btn ${isOpen ? 'is-active' : ''}`}
        onClick={(event) => {
          event.stopPropagation()
          setIsOpen((prev) => !prev)
        }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={label ? `${label} actions` : 'More actions'}
      >
        <MoreVertical size={16} />
        {label && <span className="trigger-label">{label}</span>}
      </button>

      {isOpen && (
        <div
          className={`row-action-popup-menu align-${align} direction-${direction}`}
          onClick={(event) => event.stopPropagation()}
          role="menu"
        >
          <div className="popup-menu-header">
            <span>ACTIONS</span>
          </div>
          <div className="popup-menu-items">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`action-popup-item variant-${item.variant ?? 'default'}`}
                disabled={item.disabled}
                onClick={() => {
                  setIsOpen(false)
                  item.onClick()
                }}
                role="menuitem"
              >
                <span className="action-item-icon">{item.icon}</span>
                <div className="action-item-text">
                  <span className="action-item-title">{item.label}</span>
                  {item.sublabel && <small className="action-item-sub">{item.sublabel}</small>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

