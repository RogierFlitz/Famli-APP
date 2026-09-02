"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { parentName } from "@/lib/queries/family-view";
import {
  DEFAULT_FILTERS,
  filtersAreActive,
  parentMembers,
  type CalendarFilterState,
  type EventTypeFilter,
} from "@/lib/calendar/helpers";
import type { FamilySnapshot } from "@/lib/domain/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { id: EventTypeFilter; label: string }[] = [
  { id: "school", label: "School" },
  { id: "sport", label: "Sport" },
  { id: "feestjes", label: "Feestjes" },
  { id: "reizen", label: "Reizen" },
  { id: "wissels", label: "Wissels" },
  { id: "taken", label: "Taken" },
];

export function CalendarFilters({
  snapshot,
  filters,
  onChange,
}: {
  snapshot: FamilySnapshot;
  filters: CalendarFilterState;
  onChange: (filters: CalendarFilterState) => void;
}) {
  const quickChildren = snapshot.children.slice(0, 2);
  const activeAdvanced = filtersAreActive(filters) && filters.quickFilter === "all";

  const setQuick = (id: string) => {
    onChange({ ...DEFAULT_FILTERS, quickFilter: id, showRoutines: filters.showRoutines });
  };

  const toggleChild = (childId: string) => {
    const childIds = filters.childIds.includes(childId)
      ? filters.childIds.filter((id) => id !== childId)
      : [...filters.childIds, childId];
    onChange({ ...filters, quickFilter: "all", childIds });
  };

  const toggleMember = (memberId: string) => {
    const memberIds = filters.memberIds.includes(memberId)
      ? filters.memberIds.filter((id) => id !== memberId)
      : [...filters.memberIds, memberId];
    onChange({ ...filters, quickFilter: "all", memberIds });
  };

  const toggleType = (type: EventTypeFilter) => {
    const types = filters.types.includes(type) ? filters.types.filter((item) => item !== type) : [...filters.types, type];
    onChange({ ...filters, quickFilter: "all", types });
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <FilterChip active={filters.quickFilter === "all" && !activeAdvanced} onClick={() => setQuick("all")}>
        Alles
      </FilterChip>
      {quickChildren.map((child) => (
        <FilterChip
          key={child.id}
          active={filters.quickFilter === child.id}
          onClick={() => setQuick(child.id)}
        >
          {child.firstName}
        </FilterChip>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm leading-none transition-colors",
              activeAdvanced
                ? "border-[color:var(--famli-brand)] bg-[color:var(--famli-brand-soft)] text-[color:var(--famli-ink)]"
                : "border-[color:var(--famli-border)] text-[color:var(--famli-muted)] hover:text-[color:var(--famli-ink)]",
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            Filter
            <ChevronDown className="size-3.5 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 bg-[color:var(--famli-card)] p-4">
          <FilterSection title="Kinderen">
            {snapshot.children.map((child) => (
              <FilterRow
                key={child.id}
                id={`child-${child.id}`}
                label={child.firstName}
                checked={filters.childIds.includes(child.id)}
                onCheckedChange={() => toggleChild(child.id)}
              />
            ))}
          </FilterSection>

          <FilterSection title="Gezinsleden">
            {parentMembers(snapshot).map((member) => (
              <FilterRow
                key={member.id}
                id={`member-${member.id}`}
                label={parentName(snapshot, member.id)}
                checked={filters.memberIds.includes(member.id)}
                onCheckedChange={() => toggleMember(member.id)}
              />
            ))}
            {snapshot.members
              .filter((member) => member.role !== "owner" && member.role !== "parent")
              .map((member) => (
                <FilterRow
                  key={member.id}
                  id={`member-${member.id}`}
                  label={parentName(snapshot, member.id)}
                  checked={filters.memberIds.includes(member.id)}
                  onCheckedChange={() => toggleMember(member.id)}
                />
              ))}
          </FilterSection>

          <FilterSection title="Type">
            {TYPE_OPTIONS.map((option) => (
              <FilterRow
                key={option.id}
                id={`type-${option.id}`}
                label={option.label}
                checked={filters.types.includes(option.id)}
                onCheckedChange={() => toggleType(option.id)}
              />
            ))}
          </FilterSection>

          <div className="mt-3 flex items-center justify-between border-t border-[color:var(--famli-border)] pt-3">
            <Label htmlFor="routines-toggle" className="text-sm">
              Routines tonen
            </Label>
            <Switch
              id="routines-toggle"
              checked={filters.showRoutines}
              onCheckedChange={(checked) => onChange({ ...filters, quickFilter: "all", showRoutines: checked })}
            />
          </div>

          {activeAdvanced ? (
            <button
              type="button"
              className="mt-3 w-full text-left text-xs text-[color:var(--famli-brand)]"
              onClick={() => onChange({ ...DEFAULT_FILTERS, showRoutines: filters.showRoutines })}
            >
              Filters wissen
            </button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-full px-3.5 text-sm leading-none transition-colors",
        active
          ? "bg-[color:var(--famli-brand-soft)] font-medium text-[color:var(--famli-ink)]"
          : "text-[color:var(--famli-muted)] hover:bg-[color:var(--famli-bg)]",
      )}
    >
      {children}
    </button>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FilterRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}
