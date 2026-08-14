import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import FoodMultiSelect from './presentation/components/FoodMultiSelect'
import './index.css'

const FOODS = [
  'Banana', 'Apple', 'Oatmeal', 'Avocado', 'Carrots', 'Sweet potato', 'Broccoli',
  'Chicken', 'Beef', 'Yogurt', 'Cheese', 'Eggs', 'Pasta', 'Rice', 'Peas',
  'Mango', 'Peach', 'Pear', 'Blueberries', 'Strawberries', 'Spinach',
]

function Harness() {
  const [value, setValue] = useState<string[]>([])
  return (
    <div style={{ padding: 24 }}>
      <div id="status" />
      <FoodMultiSelect value={value} onChange={setValue} suggestions={FOODS} mostUsed={['Banana', 'Avocado']} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Harness />)
