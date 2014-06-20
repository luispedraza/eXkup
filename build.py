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
LIBS_DIR = 'lib'

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
	subprocess.call(params)

def copy_file(origin, destination):
	if os.path.isfile(destination):
		return	# el archivo ya existe
	head, tail = os.path.split(destination)
	if not os.path.isdir(head):
		os.makedirs(head)
	print "copiando ", origin, " a " , destination
	shutil.copy2(origin, destination)

def join_contents(path, tags, attr, name):
	temp_file_name = os.path.join(TEMP_PATH, name)	# ruta de archivo temporal
	source = ""
	for c in tags:
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
	return temp_file_name

for path, directories, files in os.walk(SOURCE_PATH):
	relpath = os.path.relpath(path, SOURCE_PATH)
	dest_path = os.path.join(BUILD_PATH, relpath)
	# manipulación de los archivos
	for filename in files:
		dest_file_path = os.path.join(dest_path, filename)
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
				s1 = [s for s in scripts if s.get("minify") == "no"]
				s2 = [s for s in scripts if s.get("minify") != "no"]
				if len(s2) != 0:
					temp_path = join_contents(path, s2, 'src', name+".js")
					# se compila el js
					outpath = os.path.join(BUILD_PATH, relpath, 'js', name+'.min.js')
					exec_tool(JS_TOOL, temp_path, outpath)
					# se agrega la nueva etiqueta
					compiled_script = os.path.join(relpath, 'js', name+'.min.js'),
					new_script = soup.new_tag('script', type="text/javascript", src=compiled_script)
					soup.body.insert(len(soup.body.contents), new_script)
				for s in s1:
					localpath = s.get("src")
					origin = os.path.join(path, localpath)
					destination = os.path.join(dest_path, localpath)
					copy_file(origin, destination)


			# procesamiento de estilos
			styles = soup.findAll("link", attrs={'rel':'stylesheet'})
			if styles:
				temp_path = join_contents(path, styles, 'href', name+".css")
				# se compila el css
				outpath = os.path.join(BUILD_PATH, relpath, 'css', name+'.css')
				exec_tool(CSS_TOOL, temp_path, outpath)
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
			if filename[0:3] == "___":	# js especiales
				copy_file(file_path, dest_file_path)
		elif ext == '.css':
			pass
		# resto de archivos
		else:
			copy_file(file_path, dest_file_path)
			
