import { Fragment } from 'react'

export type OutOfRangeNotes = {
  higher: number
  lower: number
}

type OutOfRangeWarningProps = {
  outOfRangeNotes: OutOfRangeNotes
  className?: string
  instrumentText?: string
}

export const OutOfRangeWarning = ({
  outOfRangeNotes: { higher, lower },
  className = '',
  instrumentText = 'their respective instruments',
}: OutOfRangeWarningProps) => {
  if (!(higher || lower)) {
    return <p>All notes are within range for all instruments 🗸</p>
  }

  return (
    <div className={`panel alert-warning w-fit ${className}`}>
      {(['higher', 'lower'] as const)
        .flatMap((higherOrLower) => {
          const n = { higher, lower }[higherOrLower]
          return n
            ? [
                `${higherOrLower === 'higher' ? '↥' : '↧'} ${n} notes are ${higherOrLower}`,
              ]
            : []
        })
        .map((str, i, array) => (
          <Fragment key={i}>
            {str}
            {i === 0 && array.length === 2 && (
              <>
                ,<br />
              </>
            )}
          </Fragment>
        ))}{' '}
      than what {instrumentText} can play.
    </div>
  )
} 