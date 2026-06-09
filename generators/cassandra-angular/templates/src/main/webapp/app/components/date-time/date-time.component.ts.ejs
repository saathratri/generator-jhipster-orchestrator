import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, forwardRef } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  FormGroup,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import dayjs from 'dayjs/esm';

import { MaterialModule } from '../../shared/material.module';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-date-time',
  standalone: true,
  imports: [ReactiveFormsModule, MaterialModule, CommonModule],
  templateUrl: './date-time.component.html',
  styleUrls: ['./date-time.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimeComponent),
      multi: true,
    },
  ],
})
export class DateTimeComponent implements OnInit, ControlValueAccessor {
  editForm!: FormGroup;

  private lastValidValue: number | null = null; // Store last valid timestamp
  private preInitializedValue: boolean | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange: any = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouched: any = () => {};

  // eslint-disable-next-line @typescript-eslint/member-ordering
  disabled = false;

  // eslint-disable-next-line @typescript-eslint/member-ordering
  @Input() dateTimeLabel = 'Date-Time Label'; // Input property for the label
  // eslint-disable-next-line @typescript-eslint/member-ordering
  @Input() labelClass = 'default-label-class'; // Dynamic class for the label
  // eslint-disable-next-line @typescript-eslint/member-ordering
  @Input() isRequired = false; // Input property for the required flag
  // eslint-disable-next-line @typescript-eslint/member-ordering
  @Input() isNew!: boolean; // Receive isNew value from parent

  // Receive field name from parent
  // eslint-disable-next-line @typescript-eslint/member-ordering
  @Input() fieldName!: string;

  // Emit dirty state with field name
  // eslint-disable-next-line @typescript-eslint/member-ordering
  @Output() dirtyStateChange = new EventEmitter<{ field: string; isDirty: boolean }>();

  // eslint-disable-next-line @typescript-eslint/member-ordering
  @Output() timestampChange = new EventEmitter<number>(); // Emit the UTC timestamp

  // eslint-disable-next-line @typescript-eslint/member-ordering
  @Output() isValid = new EventEmitter<boolean>();

  ngOnInit(): void {
    this.editForm = new FormGroup(
      {
        date: new FormControl(null, this.isRequired ? Validators.required : null),
        hours: new FormControl(null, this.getValidators(1, 12)),
        minutes: new FormControl(null, this.getValidators(0, 59)),
        amPm: new FormControl(null, this.isRequired ? Validators.required : null),
        seconds: new FormControl(0),
        milliseconds: new FormControl(0),
      },
      { validators: this.dateTimeValidator }, // Attach the custom validator
    );

    // Listen to changes on relevant fields and reset seconds and milliseconds
    this.editForm.valueChanges.subscribe(() => {
      this.updateTimestamp();
      this.onTouched();
      this.isValid.emit(this.editForm.valid); // Emit the valid property directly
      // Listen for changes and emit dirty state
      this.dirtyStateChange.emit({ field: this.fieldName, isDirty: this.editForm.dirty });
    });
  }

  getValidators(min: number, max: number): ValidatorFn[] {
    return this.isRequired ? [Validators.required, Validators.min(min), Validators.max(max)] : [Validators.min(min), Validators.max(max)];
  }

  updateTimestamp(): void {
    const { date, hours, minutes, amPm } = this.editForm.value;

    if (amPm && date) {
      let adjustedHours = parseInt(hours, 10);
      if (amPm === 'PM' && adjustedHours !== 12) {
        adjustedHours += 12;
      } else if (amPm === 'AM' && adjustedHours === 12) {
        adjustedHours = 0;
      }

      // Handle both dayjs and Date objects
      const combinedDateTime = dayjs.isDayjs(date) ? date.toDate() : new Date(date);
      combinedDateTime.setHours(adjustedHours);
      combinedDateTime.setMinutes(parseInt(minutes, 10));
      combinedDateTime.setSeconds(0);
      combinedDateTime.setMilliseconds(0);

      const timestamp = combinedDateTime.getTime();
      this.onChange(timestamp); // Notify Angular forms of the change
      this.timestampChange.emit(timestamp);
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: number | string | null): void {
    if (this.preInitializedValue === null) {
      if (value === null) {
        this.preInitializedValue = false;
      } else {
        this.preInitializedValue = true;
        this.lastValidValue = typeof value === 'number' ? value : new Date(value).getTime();
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (value !== null && value !== undefined) {
      const newDate = new Date(value);
      // Convert to dayjs for Material Datepicker with DayjsDateAdapter
      const dayjsDate = dayjs(newDate);
      this.editForm.setValue(
        {
          date: dayjsDate,
          hours: this.padZero(newDate.getHours() % 12 || 12),
          minutes: this.padZero(newDate.getMinutes()),
          amPm: newDate.getHours() >= 12 ? 'PM' : 'AM',
          seconds: newDate.getSeconds(),
          milliseconds: newDate.getMilliseconds(),
        },
        { emitEvent: true },
      );
    } else {
      this.reset();
    }

    // Ensure form starts as pristine
    this.editForm.markAsPristine();
  }

  reset(): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.lastValidValue !== null && this.lastValidValue !== undefined) {
      this.writeValue(this.lastValidValue); // Restore last valid value
    } else {
      this.editForm.reset(); // Default reset if no last valid value exists
    }

    // Override the dirty state to ensure the form is clean after reset
    this.editForm.markAsPristine();
    this.dirtyStateChange.emit({ field: this.fieldName, isDirty: false });
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.editForm.disable(); // Disable all controls
    } else {
      this.editForm.enable(); // Enable all controls
    }
  }

  updateLabel(newLabel: string): void {
    this.dateTimeLabel = newLabel;
  }

  setLabelClass(newClass: string): void {
    this.labelClass = newClass;
  }

  private padZero(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }

  // Mark form as touched when the user interacts
  // eslint-disable-next-line @typescript-eslint/member-ordering
  onUserInteraction(): void {
    if (!this.editForm.dirty) {
      this.editForm.markAsDirty();
      this.dirtyStateChange.emit({ field: this.fieldName, isDirty: true });
    }
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  onInput(event: Event, field: string): void {
    const input = event.target as HTMLInputElement;
    const paddedValue = this.padZero(parseInt(input.value, 10));
    this.editForm.get(field)?.setValue(paddedValue, { emitEvent: true });
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  generateDateTime(): void {
    const now = new Date();
    const hours12 = now.getHours() % 12 || 12;
    this.editForm.setValue(
      {
        date: dayjs(now),
        hours: this.padZero(hours12),
        minutes: this.padZero(now.getMinutes()),
        amPm: now.getHours() >= 12 ? 'PM' : 'AM',
        seconds: 0,
        milliseconds: 0,
      },
      { emitEvent: true },
    );
    this.editForm.markAsDirty();
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  dateTimeValidator: ValidatorFn = (formGroup: AbstractControl): ValidationErrors | null => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const controls = ['date', 'hours', 'minutes', 'amPm'].map(field => formGroup.get(field)?.value);

    // Check if ANY field has a value
    const hasValue = controls.some(value => value !== null && value !== undefined && value !== '');

    return hasValue ? null : { required: true }; // Make it behave like Validators.required
  };
}
