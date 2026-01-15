// Import ALL components explicitly
import Button from '../components/Button.js';
import SegmentedControl from '../components/SegmentedControl.js';
import Input from '../components/Input.js';
import Slider from '../components/Slider.js';
import Text from '../components/Text.js';
import View from '../components/View.js';
import Card from '../components/Card.js';
import FAB from '../components/FAB.js';
import SpeedDialFAB from '../components/SpeedDialFAB.js';
import MorphingFAB from '../components/MorphingFAB.js';
import CircularProgress from '../components/CircularProgress.js';
import ImageComponent from '../components/ImageComponent.js';
import DatePicker from '../components/DatePicker.js';
import IOSDatePickerWheel from '../components/IOSDatePickerWheel.js';
import AndroidDatePickerDialog from '../components/AndroidDatePickerDialog.js';
import Avatar from '../components/Avatar.js';
import Snackbar from '../components/Snackbar.js';
import BottomNavigationBar from '../components/BottomNavigationBar.js';
import Video from '../components/Video.js';
import Modal from '../components/Modal.js';
import Drawer from '../components/Drawer.js';
import AppBar from '../components/AppBar.js';
import Chip from '../components/Chip.js';
import Stepper from '../components/Stepper.js';
import Accordion from '../components/Accordion.js';
import Tabs from '../components/Tabs.js';
import Switch from '../components/Switch.js';
import SwipeableListItem from '../components/SwipeableListItem.js';
import ListItem from '../components/ListItem.js';
import List from '../components/List.js';
import VirtualList from '../components/VirtualList.js';
import BottomSheet from '../components/BottomSheet.js';
import ProgressBar from '../components/ProgressBar.js';
import RadioButton from '../components/RadioButton.js';
import Dialog from '../components/Dialog.js';
import ContextMenu from '../components/ContextMenu.js';
import Checkbox from '../components/Checkbox.js';
import Toast from '../components/Toast.js';
import NumberInput from '../components/NumberInput.js';
import TextField from '../components/TextField.js';
import SelectDialog from '../components/SelectDialog.js';
import Select from '../components/Select.js';
import MultiSelectDialog from '../components/MultiSelectDialog.js';
import Divider from '../components/Divider.js';
import FileUpload from '../components/FileUpload.js';
import Table from '../components/Table.js';
import TreeView from '../components/TreeView.js';
import SearchInput from '../components/SearchInput.js';
import ImageCarousel from '../components/ImageCarousel.js';
import PasswordInput from '../components/PasswordInput.js';
import InputTags from '../components/InputTags.js';
import InputDatalist from '../components/InputDatalist.js';
import Banner from '../components/Banner.js';

// Features
import PullToRefresh from '../features/PullToRefresh.js';
import Skeleton from '../features/Skeleton.js';
import SignaturePad from '../features/SignaturePad.js';
import OpenStreetMap from '../features/OpenStreetMap.js';
import LayoutComponent from '../features/LayoutComponent.js';
import Grid from '../features/Grid.js';
import Row from '../features/Row.js';
import Column from '../features/Column.js';
import Positioned from '../features/Positioned.js';
import Stack from '../features/Stack.js';

/**
 * Map of all available components
 */
const Components = {
  Button,
  SegmentedControl,
  Input,
  Slider,
  Text,
  View,
  Card,
  FAB,
  SpeedDialFAB,
  MorphingFAB,
  CircularProgress,
  ImageComponent,
  DatePicker,
  IOSDatePickerWheel,
  AndroidDatePickerDialog,
  Avatar,
  Snackbar,
  BottomNavigationBar,
  Video,
  Modal,
  Drawer,
  AppBar,
  Chip,
  Stepper,
  Accordion,
  Tabs,
  Switch,
  SwipeableListItem,
  ListItem,
  List,
  VirtualList,
  BottomSheet,
  ProgressBar,
  RadioButton,
  Dialog,
  ContextMenu,
  Checkbox,
  Toast,
  NumberInput,
  TextField,
  SelectDialog,
  Select,
  MultiSelectDialog,
  Divider,
  FileUpload,
  Table,
  TreeView,
  SearchInput,
  ImageCarousel,
  PasswordInput,
  InputTags,
  InputDatalist,
  PullToRefresh,
  Skeleton,
  SignaturePad,
  OpenStreetMap,
  LayoutComponent,
  Grid,
  Row,
  Column,
  Positioned,
  Banner,
  Stack
};

/**
 * Crée un objet ref pour stocker une référence
 */
export function createRef() {
  return { current: null };
}

/**
 * DSL déclaratif pour CanvasFramework
 */
class UIBuilder {
  constructor() {
    this._tree = null;
  }

  /* ============================
     BASE
  ============================ */

  _create(type, props = {}, children = []) {
    return { type, props, children };
  }

  mount(framework) {
    if (!this._tree) return;
    this._mountNode(framework, this._tree, null);
  }

  _mountNode(framework, node, parent = null) {
    if (!node) return null;

    const ComponentClass = Components[node.type];
    if (!ComponentClass) {
      console.warn(`UIBuilder: composant inconnu "${node.type}"`);
      return null;
    }

    // Extraire la ref des props si elle existe
    const { ref, ...componentProps } = node.props;

    const instance = new ComponentClass(framework, componentProps);

    // ✅ Si une ref est fournie, y stocker l'instance
    if (ref && typeof ref === 'object' && 'current' in ref) {
      ref.current = instance;
    }

    // ✅ Ajouter au framework UNIQUEMENT si ce n'est pas un enfant de Card
    const isChildOfCard = parent && parent.constructor?.name === 'Card';
    if (!isChildOfCard) {
        framework.add(instance);
    }

    // ✅ Ajouter au parent si parent existe et supporte add
    if (parent && typeof parent.add === 'function') {
      parent.add(instance);
    }

    // Monter les enfants
    if (node.children && node.children.length > 0) {
      node.children.forEach(child =>
        this._mountNode(framework, child, instance)
      );
    }

    return instance;
  } 

  /* ============================
     ROOT
  ============================ */

  app(node) {
    this._tree = node;
    return this;
  }
}

/* ============================
   FACTORIES AUTOMATIQUES
============================ */

const ui = new UIBuilder();

// Génération automatique pour TOUS les composants
Object.keys(Components).forEach((name) => {
  const factoryName = name.charAt(0).toLowerCase() + name.slice(1);
  
  const factory = (props = {}, children = []) => {
    // Ensure children is always an array
    const childArray = Array.isArray(children) ? children : (children ? [children] : []);
    return ui._create(name, props, childArray);
  };
  
  // Add both lowercase and uppercase versions
  ui[factoryName] = factory;  // e.g., ui.text
  ui[name] = factory;          // e.g., ui.Text
});

/* ============================
   ALIAS SUPPLÉMENTAIRES
============================ */

// Ensure these exist even if they were auto-generated
ui.column = ui.column || ((props = {}, children = []) =>
  ui._create('Column', props, Array.isArray(children) ? children : [children]));

ui.row = ui.row || ((props = {}, children = []) =>
  ui._create('Row', props, Array.isArray(children) ? children : [children]));

ui.stack = ui.stack || ((props = {}, children = []) =>
  ui._create('Stack', props, Array.isArray(children) ? children : [children]));

ui.grid = ui.grid || ((props = {}, children = []) =>
  ui._create('Grid', props, Array.isArray(children) ? children : [children]));

export default ui;