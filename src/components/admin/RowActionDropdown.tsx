import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({ visibility: 'hidden' })

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
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

  useLayoutEffect(() => {
    if (!isOpen) return

    function positionMenu() {
      const trigger = dropdownRef.current?.querySelector('.row-action-trigger-btn')
      const menu = menuRef.current
      if (!(trigger instanceof HTMLElement) || !menu) return

      const triggerRect = trigger.getBoundingClientRect()
      const menuRect = menu.getBoundingClientRect()
      const viewportPadding = 8
      const gap = 6
      const roomBelow = window.innerHeight - triggerRect.bottom - viewportPadding
      const roomAbove = triggerRect.top - viewportPadding
      const opensUp = direction === 'up' || (menuRect.height > roomBelow && roomAbove > roomBelow)
      const availableHeight = Math.max(80, opensUp ? roomAbove : roomBelow)
      const height = Math.min(menuRect.height, availableHeight)
      const top = opensUp
        ? Math.max(viewportPadding, triggerRect.top - height - gap)
        : Math.min(window.innerHeight - height - viewportPadding, triggerRect.bottom + gap)
      const left = align === 'left'
        ? triggerRect.left
        : triggerRect.right - menuRect.width
      const boundedLeft = Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - menuRect.width - viewportPadding),
      )

      setMenuStyle({
        position: 'fixed',
        top,
        left: boundedLeft,
        bottom: 'auto',
        maxHeight: availableHeight,
        zIndex: 10000,
        visibility: 'visible',
      })
    }

    positionMenu()
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [align, direction, isOpen, items.length])

  return (
    <>
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
      </div>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className={`row-action-popup-menu align-${align} direction-${direction}`}
          style={menuStyle}
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
        </div>,
        document.body,
      )}
    </>
  )
}
