# Admin Modal Components

Reusable and consistent modal components for the admin panel.

## Components Overview

### 1. ViewDialog
**Purpose**: Display read-only information in a modal.

**Use Cases**:
- User details view
- Product details view  
- License details view
- Any read-only data display

**Features**:
- Scrollable content with fixed header
- Three size options: `sm` (500px), `md` (550px), `lg` (600px)
- Automatic overflow handling
- Consistent styling

**Example**:
```tsx
import { ViewDialog, DetailRow } from "@/components/admin";

<ViewDialog
  open={open}
  onOpenChange={setOpen}
  title="User Details"
  maxWidth="sm"
>
  <div className="space-y-6">
    <DetailRow 
      icon={<UserIcon className="size-4" />} 
      label="Name" 
      value={user.name} 
    />
  </div>
</ViewDialog>
```

---

### 2. DetailRow
**Purpose**: Display labeled key-value pairs with an icon.

**Use Cases**:
- Information rows in ViewDialog
- Consistent data display format
- Icon-labeled values

**Example**:
```tsx
import { DetailRow } from "@/components/admin";

<DetailRow
  icon={<MailIcon className="size-4" />}
  label="Email"
  value={user.email}
/>

// With React component as value
<DetailRow
  icon={<ShieldIcon className="size-4" />}
  label="Role"
  value={<Badge variant="default">{user.role}</Badge>}
/>
```

---

### 3. FormDialog
**Purpose**: Simple forms with callback-based submission.

**Use Cases**:
- Simple forms without complex validation
- Forms that don't need FormData access
- Quick inline editing

**Features**:
- Built-in submit/cancel buttons
- Loading states with spinner
- Custom footer content support
- Flexible sizing

**Example**:
```tsx
import { FormDialog } from "@/components/admin";

<FormDialog
  open={open}
  onOpenChange={setOpen}
  title="Quick Edit"
  description="Update the information"
  maxWidth="sm"
  submitText="Save"
  cancelText="Cancel"
  isLoading={isLoading}
  onSubmit={handleSubmit}
>
  <div className="grid gap-4">
    <Input name="name" placeholder="Name" />
  </div>
</FormDialog>
```

---

### 4. FormDialogWrapper
**Purpose**: Complex forms with native FormData handling.

**Use Cases**:
- Forms needing FormData access
- Complex validation and error handling
- Multi-field forms with hidden inputs
- Server actions with FormData

**Features**:
- Native form element with ref access
- Scrollable content with fixed header/footer
- Consistent form structure
- Built-in loading states

**Example**:
```tsx
import { FormDialogWrapper } from "@/components/admin";

const formRef = useRef<HTMLFormElement>(null);

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  // Handle submission
};

<FormDialogWrapper
  open={open}
  onOpenChange={setOpen}
  title="Create Product"
  description="Fill in the product details"
  maxWidth="md"
  submitText="Create"
  isLoading={isLoading}
  onSubmit={handleSubmit}
  formRef={formRef}
>
  <input type="hidden" name="id" value={id} />
  
  <div className="grid gap-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" name="name" required />
  </div>
  
  <div className="grid gap-2">
    <Label htmlFor="description">Description</Label>
    <Textarea id="description" name="description" />
  </div>
</FormDialogWrapper>
```

---

## Modal Structure Pattern

All modal components follow a consistent structure:

```
┌─────────────────────────────────┐
│ Header (fixed)                  │  <- DialogHeader with flex-shrink-0
│ - Title                         │
│ - Description (optional)        │
├─────────────────────────────────┤
│                                 │
│ Content (scrollable)            │  <- overflow-y-auto, flex-1, min-h-0
│ - Form fields                   │
│ - Information display           │
│ - ...scrollable content         │
│                                 │
├─────────────────────────────────┤
│ Footer (fixed)                  │  <- DialogFooter with flex-shrink-0
│ - Cancel / Submit buttons       │
└─────────────────────────────────┘
```

### Key CSS Classes for Modal Layout:

**Dialog Content**:
- `flex flex-col` - Flexbox column layout
- `max-h-[calc(100vh-2rem)]` - Max height with margin
- `overflow-hidden` - Prevent outer scroll

**Header**:
- `flex-shrink-0` - Prevent header from shrinking

**Content Area**:
- `flex-1` - Take remaining space
- `min-h-0` - Allow flex child to shrink below content size
- `overflow-y-auto` - Enable scrolling when needed

**Footer** (forms only):
- `flex-shrink-0` - Prevent footer from shrinking

---

## Size Options

All dialog components support three size presets:

| Size | Class | Width |
|------|-------|-------|
| `sm` | `sm:max-w-[500px]` | 500px |
| `md` | `sm:max-w-[550px]` | 550px |
| `lg` | `sm:max-w-[600px]` | 600px |

Mobile: All sizes use `max-w-[calc(100%-2rem)]` for 1rem margin on each side.

---

## Best Practices

### 1. **Choose the Right Component**

- **ViewDialog** → Read-only information display
- **FormDialog** → Simple forms with callbacks
- **FormDialogWrapper** → Complex forms with FormData

### 2. **Consistent Content Spacing**

```tsx
// View dialogs
<div className="space-y-6">
  {/* Content */}
</div>

// Form fields
<div className="grid gap-6">
  {/* Form fields */}
</div>
```

### 3. **Use DetailRow for Information Display**

Always use `DetailRow` in view dialogs for consistency:

```tsx
<div className="grid gap-4">
  <DetailRow icon={...} label="..." value="..." />
  <DetailRow icon={...} label="..." value="..." />
</div>
```

### 4. **Form Field Pattern**

```tsx
<div className="grid gap-2">
  <Label htmlFor="fieldName">Field Label</Label>
  <Input id="fieldName" name="fieldName" />
  {errors.fieldName && (
    <p className="text-destructive text-sm">{errors.fieldName[0]}</p>
  )}
</div>
```

### 5. **Loading States**

All form components handle loading states automatically:
- Disable buttons when `isLoading={true}`
- Show spinner on submit button
- Prevent form interaction during submission

---

## Migration Examples

### Before (Inconsistent):

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>User Details</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      {/* Content that might overflow */}
    </div>
  </DialogContent>
</Dialog>
```

### After (Consistent):

```tsx
<ViewDialog
  open={open}
  onOpenChange={setOpen}
  title="User Details"
  maxWidth="sm"
>
  <div className="space-y-6">
    <DetailRow icon={...} label="..." value="..." />
  </div>
</ViewDialog>
```

---

## Component Files

```
components/admin/
├── view-dialog.tsx          # Read-only display modals
├── detail-row.tsx           # Information row component
├── form-dialog.tsx          # Simple form modals
├── form-dialog-wrapper.tsx  # Complex form modals
└── index.ts                 # Central export point
```

All components are exported from `@/components/admin` for easy importing.
