import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts'
import { abbrNum } from '../lib/format'
import { useRouter } from 'next/router'

const dateFormatter = when => {
  return timeStr => {
    const date = new Date(timeStr)
    switch (when) {
      case 'week':
      case 'month':
        return `${('0' + (date.getUTCMonth() % 12 + 1)).slice(-2)}/${date.getUTCDate()}`
      case 'year':
      case 'forever':
        return `${('0' + (date.getUTCMonth() % 12 + 1)).slice(-2)}/${String(date.getUTCFullYear()).slice(-2)}`
      default:
        return `${date.getHours() % 12 || 12}${date.getHours() >= 12 ? 'pm' : 'am'}`
    }
  }
}

function xAxisName (when) {
  switch (when) {
    case 'week':
    case 'month':
      return 'days'
    case 'year':
    case 'forever':
      return 'months'
    default:
      return 'hours'
  }
}

const transformData = data => {
  return data.map(entry => {
    const obj = { time: entry.time }
    entry.data.forEach(entry1 => {
      obj[entry1.name] = entry1.value
    })
    return obj
  })
}

const COLORS = [
  'var(--secondary)',
  'var(--info)',
  'var(--success)',
  'var(--boost)',
  'var(--theme-grey)',
  'var(--danger)'
]

export function WhenAreaChart ({ data }) {
  const router = useRouter()
  if (!data || data.length === 0) {
    return null
  }
  // transform data into expected shape
  data = transformData(data)
  // need to grab when
  const when = router.query.when

  return (
    <ResponsiveContainer width='100%' height={300} minWidth={300}>
      <AreaChart
        data={data}
        margin={{
          top: 5,
          right: 5,
          left: 0,
          bottom: 0
        }}
      >
        <XAxis
          dataKey='time' tickFormatter={dateFormatter(when)} name={xAxisName(when)}
          tick={{ fill: 'var(--theme-grey)' }}
        />
        <YAxis tickFormatter={abbrNum} tick={{ fill: 'var(--theme-grey)' }} />
        <Tooltip labelFormatter={dateFormatter(when)} contentStyle={{ color: 'var(--theme-color)', backgroundColor: 'var(--theme-body)' }} />
        <Legend />
        {Object.keys(data[0]).filter(v => v !== 'time' && v !== '__typename').map((v, i) =>
          <Area key={v} type='monotone' dataKey={v} name={v} stackId='1' stroke={COLORS[i]} fill={COLORS[i]} />)}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function WhenLineChart ({ data }) {
  const router = useRouter()
  if (!data || data.length === 0) {
    return null
  }
  // transform data into expected shape
  data = transformData(data)
  // need to grab when
  const when = router.query.when

  return (
    <ResponsiveContainer width='100%' height={300} minWidth={300}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 5,
          left: 0,
          bottom: 0
        }}
      >
        <XAxis
          dataKey='time' tickFormatter={dateFormatter(when)} name={xAxisName(when)}
          tick={{ fill: 'var(--theme-grey)' }}
        />
        <YAxis tickFormatter={abbrNum} tick={{ fill: 'var(--theme-grey)' }} />
        <Tooltip labelFormatter={dateFormatter(when)} contentStyle={{ color: 'var(--theme-color)', backgroundColor: 'var(--theme-body)' }} />
        <Legend />
        {Object.keys(data[0]).filter(v => v !== 'time' && v !== '__typename').map((v, i) =>
          <Line key={v} type='monotone' dataKey={v} name={v} stroke={COLORS[i]} fill={COLORS[i]} />)}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function WhenComposedChart ({ data, lineNames, areaNames, barNames }) {
  const router = useRouter()
  if (!data || data.length === 0) {
    return null
  }
  // transform data into expected shape
  data = transformData(data)
  // need to grab when
  const when = router.query.when

  return (
    <ResponsiveContainer width='100%' height={300} minWidth={300}>
      <ComposedChart
        data={data}
        margin={{
          top: 5,
          right: 5,
          left: 0,
          bottom: 0
        }}
      >
        <XAxis
          dataKey='time' tickFormatter={dateFormatter(when)} name={xAxisName(when)}
          tick={{ fill: 'var(--theme-grey)' }}
        />
        <YAxis yAxisId='left' orientation='left' allowDecimals={false} stroke='var(--theme-grey)' tickFormatter={abbrNum} tick={{ fill: 'var(--theme-grey)' }} />
        <YAxis yAxisId='right' orientation='right' allowDecimals={false} stroke='var(--theme-grey)' tickFormatter={abbrNum} tick={{ fill: 'var(--theme-grey)' }} />
        <Tooltip labelFormatter={dateFormatter(when)} contentStyle={{ color: 'var(--theme-color)', backgroundColor: 'var(--theme-body)' }} />
        <Legend />
        {barNames?.map((v, i) =>
          <Bar yAxisId='right' key={v} type='monotone' dataKey={v} name={v} stroke='var(--info)' fill='var(--info)' />)}
        {areaNames?.map((v, i) =>
          <Area yAxisId='left' key={v} type='monotone' dataKey={v} name={v} stackId='1' stroke={COLORS[i]} fill={COLORS[i]} />)}
        {lineNames?.map((v, i) =>
          <Line yAxisId='left' key={v} type='monotone' dataKey={v} name={v} stackId='1' stroke={COLORS[i]} fill={COLORS[i]} />)}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
