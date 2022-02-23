/*
 * seq.mjs
 *
 * Copyright (c) 2020 haiix
 *
 * This module is released under the MIT license:
 * https://opensource.org/licenses/MIT
 */

export const version = '0.1.2beta'

class ArrayIterator {
  constructor (iterator) {
    this[Symbol.iterator] = () => iterator[Symbol.iterator]()
  }

  concat (...items) {
    return new ArrayIterator([this, ...items]).flat()
  }

  entries () {
    return this.map((v, i) => [i, v])
  }

  every (callbackfn, thisArg = null) {
    return !this.map(callbackfn, thisArg).map(v => !!v).includes(false)
  }

  fill (value, start = 0, end = Number.MAX_SAFE_INTEGER) {
    if (start < 0 || end < 0) return new ArrayIterator(this.toArray().fill(...arguments))
    return this.map((v, i) => (i >= start && i < end) ? value : v)
  }

  filter (callbackfn, thisArg = null) {
    return this.flatMap((v, i, ite) => callbackfn.call(thisArg, v, i, ite) ? [v] : [])
  }

  find (callbackfn, thisArg = null) {
    for (const [i, v] of this.entries()) if (callbackfn.call(thisArg, v, i, this)) return v
  }

  findIndex (callbackfn, thisArg = null) {
    for (const [i, v] of this.entries()) if (callbackfn.call(thisArg, v, i, this)) return i
    return -1
  }

  flat (depth = 1) {
    return new ArrayIterator(function * recur (ite, depth) {
      for (const v of ite) {
        if (depth > 0 && v !== null && typeof v[Symbol.iterator] === 'function') {
          yield * recur(v, depth - 1)
        } else {
          yield v
        }
      }
    }(this, depth))
  }

  flatMap (mapperFunction, thisArg) {
    return this.map(mapperFunction, thisArg).flat()
  }

  forEach (callbackfn, thisArg = null) {
    this.map(callbackfn, thisArg).fill(0).indexOf(1)
  }

  includes (searchElement, fromIndex = 0) {
    return this.indexOf(searchElement, fromIndex) >= 0
  }

  indexOf (searchElement, fromIndex = 0) {
    if (fromIndex < 0) return this.toArray().indexOf(...arguments)
    return this.findIndex((v, i) => i >= fromIndex && v === searchElement)
  }

  join (separator = ',') {
    return this.toArray().join(...arguments)
  }

  keys () {
    return this.map((v, i) => i)
  }

  lastIndexOf (searchElement, fromIndex = undefined) {
    return this.toArray().lastIndexOf(...arguments)
  }

  map (callbackfn, thisArg = null) {
    return new ArrayIterator(function * (ite, i) {
      for (const v of ite) yield callbackfn.call(thisArg, v, ++i, ite)
    }(this, -1))
  }

  reduce (callbackfn, initialValue = undefined) {
    let value = initialValue
    for (const [i, v] of this.entries()) value = (i === 0 && arguments.length === 1) ? v : callbackfn(value, v, i, this)
    return value
  }

  reduceRight (callbackfn, initialValue = undefined) {
    return this.toArray().reduceRight(...arguments)
  }

  slice (start = 0, end = Number.MAX_SAFE_INTEGER) {
    return new ArrayIterator(
      start < 0 || end < 0
        ? this.toArray().slice(...arguments)
        : (function * (ite, i) {
            for (const v of ite) {
              if (++i >= end) return
              if (i >= start) yield v
            }
          }(this, -1))
    )
  }

  some (callbackfn, thisArg = null) {
    return this.map(callbackfn, thisArg).map(v => !!v).includes(true)
  }

  toArray () {
    return Array.from(this)
  }

  toString () {
    return this.join('')
  }

  values () {
    return new ArrayIterator(this)
  }
}

export default function seq (iterator) {
  if (typeof iterator === 'number') {
    return new ArrayIterator(Array(iterator).keys())
  } else if (iterator instanceof ArrayIterator) {
    return iterator
  } else if (typeof iterator[Symbol.iterator] === 'function') {
    return new ArrayIterator(iterator)
  } else {
    throw new TypeError('The given argument is not a number or iterable.')
  }
}
