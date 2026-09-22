import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputProps,
  NumberInputStepper,
} from '@chakra-ui/react'

export type NumberInputWithLabelProps = {
  labelBefore?: string
  labelAfter?: string
} & NumberInputProps

export const NumberInputWithLabel = ({
  labelBefore,
  labelAfter,
  className,
  ...numberInputProps
}: NumberInputWithLabelProps) => (
  <div className={`my-3 ${className}`}>
    {labelBefore && <p className="inline-block w-fit mr-4">{labelBefore}</p>}
    <NumberInput className="inline-block" {...numberInputProps}>
      <NumberInputField />
      <NumberInputStepper>
        <NumberIncrementStepper />
        <NumberDecrementStepper />
      </NumberInputStepper>
    </NumberInput>
    {labelAfter && <p className="inline-block w-fit ml-4">{labelAfter}</p>}
  </div>
)
