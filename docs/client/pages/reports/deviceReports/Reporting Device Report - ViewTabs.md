# ViewTabs

> The Spreadsheet / Post Data toggle buttons in the device report toolbar, and the `DeviceView` type.

## Purpose

`ViewTabs` renders the two view buttons for the device report and exports the union type that
names them. It is a pair of `Button`s rather than a Material UI `Tabs` so it sits inline in the
toolbar beside the other small buttons. The list of tabs is a module constant so the page only
deals with the id.

## Interface

```ts
export type DeviceView = 'spreadsheet' | 'postdata';
```

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `DeviceView` | yes | The active view. |
| `onChange` | `(view: DeviceView) => void` | yes | Called with the clicked tab's id. |

Default export: `ViewTabs`.

## Uses

- Material UI `Button`.

## Used By

- [DeviceReports page](<../Reporting Page - DeviceReports.md>) for both the component and the
  `DeviceView` type of its `activeTab` state.

## Key Behavior

- The component returns an array of buttons, not a wrapper element, so they inherit the
  toolbar's flex layout and gap.
- The active tab is `contained`, the other `outlined`; both are `size="small"`.
- Labels are `Spreadsheet` and `Post Data`, ids `spreadsheet` and `postdata`, in that order.
- Clicking the active tab calls `onChange` with the same id; the page's `setActiveTab` then
  sets an unchanged value.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/deviceReports/ViewTabs.tsx](../../../../../client/src/pages/reports/deviceReports/ViewTabs.tsx)
