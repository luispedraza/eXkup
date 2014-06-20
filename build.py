#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os 
import shutil
from bs4 import BeautifulSoup as BS
from bs4 import Tag
import subprocess

SOURCE_DIR = 'src'
BUILD_DIR = 'build'
TOOLS_DIR = 'build-tools'
TEMP_DIR = 'temp'

TOOLS = {
	'yui': {
		'command': 'yuicompressor-2.4.8.jar',
		'params': ['java', '-jar', '__TOOL__', '-o', '__OUPUT__','__INPUT__']
	},
	'closure': {
		'command': 'closure-compiler.jar',
		'params': ['java', '-jar', '__TOOL__', '--js_output_file', '__OUPUT__','--js', '__INPUT__']
	}
}

JS_TOOL = TOOLS.get('yui')
CSS_TOOL = TOOLS.get('yui')

# directorios de trabajo:
SOURCE_PATH = os.path.join('.', SOURCE_DIR)
TEMP_PATH = os.path.join('.', TEMP_DIR)
BUILD_PATH = os.path.join('.', BUILD_DIR)
JS_OUPUT_PATH = os.path.join(BUILD_PATH, 'js')
CSS_OUPUT_PATH = os.path.join(BUILD_PATH, 'css')

try:
	# cleaning previous output
	shutil.rmtree(BUILD_PATH)
	shutil.rmtree(TEMP_PATH)
except OSError as e:
	pass

os.mkdir(BUILD_PATH)		# el directorio de destino
os.mkdir(TEMP_PATH)			# el directorio temporal
os.mkdir(JS_OUPUT_PATH)
os.mkdir(CSS_OUPUT_PATH)

# ejecución de una herramient
def exec_tool(tool, inpath, outpath):
	command = os.path.join('.', TOOLS_DIR, tool['command'])	#herramienta
	params = tool['params'][:]
	for i,p in enumerate(params):
		if p=='__TOOL__':
			params[i] = command
		if p=='__INPUT__':
			params[i] = inpath
		if p=='__OUPUT__':
			params[i] = outpath
	print params
	subprocess.call(params)

def join_contents(path, contents, attr, ouput):
	source = ""
	for c in contents:
		try:
			c_path = os.path.join(path, c.get(attr))
			c_file = open(c_path)
			source += c_file.read() + "\n"	# agregar código
			c_file.close()
			c.extract()	# se elimina la etiqueta
		except IOError as e: # puede haber links remotos (fuentes)
			pass
	# se guarda todo el js en un archivo temporal
	temp_file = open(temp_file_name, 'w+')
	temp_file.write(source)
	temp_file.close()

for path, directories, files in os.walk(SOURCE_PATH):
	relpath = os.path.relpath(path, SOURCE_PATH)
	dest_path = os.path.join(BUILD_PATH, relpath)
	# creación del directorio de destino
	if not os.path.exists(dest_path):
		os.makedirs(dest_path)
	# manipulación de los archivos
	for filename in files:
		file_path = os.path.join(path, filename)		# ruta del archivo actual
		name, ext = os.path.splitext(filename)			# extensión del archivo
		# archivos html
		if ext == '.html':
			print "******* HTML *******"
			print "archivo: " + filename
			html_file = open(file_path)
			soup = BS(html_file)
			html_file.close()
			# procesamiento del scripts
			scripts = soup.findAll("script")
			if scripts:
				source = ""
				for s in scripts:
					js_path = os.path.join(path, s.get('src'))
					js_file = open(js_path)
					source += js_file.read() + "\n"	# agregar código
					js_file.close()
					s.extract()	# se elimina la etiqueta de script
				# se guarda todo el js en un archivo temporal
				temp_file_name = os.path.join(TEMP_PATH, name+".js")	# js de este html
				temp_file = open(temp_file_name, 'w+')
				temp_file.write(source)
				temp_file.close()
				# se compila el js
				inpath = temp_file_name
				outpath = os.path.join(BUILD_PATH, relpath, 'js', name+'.min.js')
				print "compilando " + inpath + " a " + outpath
				exec_tool(JS_TOOL, inpath, outpath)
				# se agrega la nueva etiqueta
				compiled_script = os.path.join(relpath, 'js', name+'.min.js'),
				new_script = soup.new_tag('script', type="text/javascript", src=compiled_script)
				soup.body.insert(len(soup.body.contents), new_script)

			# procesamiento de estilos
			styles = soup.findAll("link", attrs={'rel':'stylesheet'})
			if styles:
				temp_file_name = os.path.join(TEMP_PATH, name+".css")	# js de este html
				join_contents(path, styles, 'href', temp_file_name)
				# se compila el css
				inpath = temp_file_name
				outpath = os.path.join(BUILD_PATH, relpath, 'css', name+'.css')
				print "compilando " + inpath + " a " + outpath
				exec_tool(CSS_TOOL, inpath, outpath)
				# se agrega la nueva etiqueta
				compiled_css = os.path.join(relpath, 'css', name+'.css'),
				new_css = soup.new_tag('link', type="text/css", rel="stylesheet", href=compiled_css)
				soup.head.insert(len(soup.head.contents), new_css)

			# se guarda el nuevo html
			target_html_path = os.path.join(dest_path, filename)
			with open(target_html_path, 'w+') as target:
				target.write(soup.prettify('utf-8'))
				target.close()

		#archivos js
		elif ext == '.js':
			if filename[0:3] == "___":
				shutil.copy2(file_path, dest_path)
		elif ext == '.css':
			pass
		# resto de archivos
		else:
			shutil.copy2(file_path, dest_path)
